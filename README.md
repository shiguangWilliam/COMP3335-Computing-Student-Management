# COMP3335 Deployment Guide (Windows)

This README focuses on how to get the Computing Student Management System running on a Windows 10/11 workstation. It covers the all-in-one launcher, manual deployment steps, and common troubleshooting scenarios.

---

## Prerequisites

| Component | Minimum Version | Notes |
|-----------|-----------------|-------|
| Windows | 10/11 (64-bit) | PowerShell 5.1+ is built in |
| Docker Desktop | Latest | Required for the Percona MySQL container |
| JDK | 21+ | Used by the Spring Boot backend (`mvnw` bundles Maven) |
| Node.js | 18+ (20+ recommended) | Used by the Next.js frontend |

> If PowerShell blocks script execution, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` once in the terminal. Administrators can permanently allow scripts via `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`.

---

## Quickstart (recommended)

1. Ensure the prerequire environment is complete
2. Open PowerShell in the project root and run:

   ```powershell
   .\scripts\start-all.ps1 [-ResetData] [-SkipSeed] [-DockerDir C:\CustomPath]
   ```

   - `-ResetData` wipes existing database files before starting Percona.
   - `-SkipSeed` skips running `TestAccountSeeder` if you already have data.
   - `-DockerDir` stores the MySQL data/keyring in a custom parent directory (the script creates `<DockerDir>\docker`).

3. The script launches database, backend, and frontend in dedicated PowerShell windows, installs missing Node dependencies, generates seed data (unless skipped), and waits for the Percona container to be healthy.
4. When the final window reports success, browse to `http://localhost:3000`. Default test accounts are printed in the launcher window.
5. To stop everything, run:

   ```powershell
   .\scripts\stop-all.ps1
   ```

That’s it—no manual steps are needed unless you prefer finer control.

---

## Manual Deployment Steps

Follow this path only if you want to operate each component yourself or there are something wrong with auto script.

### 1. Database (Percona MySQL)

```powershell
cd <project-root>
.\scripts\setup-percona.ps1 [-ResetData] [-DockerDir C:\CustomPath]
```

- The script ensures `docker/data`, `docker/keyring`, and `docker/my.cnf` exist, recreates the `comp3335-db` container, and mounts `init_database.sql` so tables and sample data are created automatically.
- Verify the container with `docker ps --filter "name=comp3335-db"` and connect via `docker exec -it comp3335-db mysql -uroot -p!testCOMP3335`.

### 2. Backend (Spring Boot)

```powershell
cd <project-root>
.\mvnw spring-boot:run
```

- Exposes port `3335` locally. Confirm startup once `Started Application` appears.
- Optional seed rerun: `.\mvnw --% -q compile exec:java -Dexec.mainClass=scripts.TestAccountSeeder`.

### 3. Frontend (Next.js)

```powershell
cd <project-root>/frontend
npm install            # first time only
copy .env.local.example .env.local  # if you keep a template
# or create .env.local manually:
# NEXT_PUBLIC_API_URL=http://127.0.0.1:3335
# GATEWAY_SHARED_SECRET=<same as backend>

npm run dev
```

- The frontend proxy forwards `/API/*` calls to the backend at `127.0.0.1:3335`. Adjust `NEXT_PUBLIC_API_URL` only if the backend is on another host.

### 4. Access & Shutdown

- Access the UI at `http://localhost:3000` (or `http://<host-ip>:3000` after opening the port in Windows Firewall).
- Stop individual services manually (Ctrl+C) or run `.\scripts\stop-all.ps1` to close the container and release ports `3000`, `3335`, and `3306`.

---

## Troubleshooting

- **Docker not detected / stuck in "waiting"**: Start Docker Desktop manually, then rerun the script. `start-all.ps1` times out after five minutes; if it fails, check Docker Desktop logs.
- **Ports already in use (3000/3335/3306)**: Release them before launching. Use `Get-NetTCPConnection -LocalPort <port>` to find the owning PID, then `Stop-Process -Id <pid> -Force` or use `Windows Task manager`if needed.
- **Script execution blocked**: PowerShell may show `annot be loaded because running scripts is disabled on this system.`. Use the execution-policy commands listed in the prerequisites section.
- **Percona container loops or keeps crashing**: Rerun `setup-percona.ps1 -ResetData` to clear corrupted volumes, or inspect logs via `docker logs comp3335-db`.
- **Backend fails to connect to DB**: Confirm `comp3335-db` is `Running`, port `3306` is reachable, and credentials in `src/main/resources/application.properties` match `root/!testCOMP3335` (or whichever values you changed).
- **Frontend cannot reach API**: Ensure `.env.local` points to a reachable backend URL and both `GATEWAY_SHARED_SECRET` values (frontend and backend) match; restart `npm run dev` after edits.
- **Need to relocate Docker data**: Use `-DockerDir D:\COMP3335Data` on either script. The helper will create `D:\COMP3335Data\docker\data` and `keyring` so large database files do not live inside the repo.

Run `stop-all.ps1`or stop all the process manully and then the relevant start script again after resolving any of the issues above to ensure all processes reload cleanly.

