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


### How to Install the Required Dependencies

#### 1. Install Docker Desktop

1. Go to the official Docker Desktop download page: https://www.docker.com/products/docker-desktop/
2. Download the Windows installer and run it.
3. Follow the installation wizard. When prompted, enable the required Windows features (WSL 2 or Hyper-V).
4. After installation, launch Docker Desktop and wait for it to start successfully (the Docker icon should appear in the system tray).
5. Verify installation by opening PowerShell and running:
   ```powershell
   docker --version
   ```
   You should see the Docker version information.

#### 2. Install JDK (Java Development Kit)

1. Go to the official OpenJDK download page: https://adoptium.net/en-GB/temurin/releases?version=21&os=any&arch=any
2. Download the latest LTS (e.g., JDK 21) Windows x64 MSI installer.
3. Run the installer and follow the prompts to complete installation. If you need, you can allow to overwrite the `JAVA_HOME` variable.
4. Any problems can refer to the installation guid on https://adoptium.net/en-GB/installation/windows
4. After installation, open a new PowerShell window and run:
   ```powershell
   java -version
   ```
   You should see the installed Java version.

#### 3. Install Node.js

1. Go to the official Node.js download page: https://nodejs.org/en/download
2. Download the Windows Installer (LTS version recommended).
3. Run the installer and follow the prompts to complete installation.
4. After installation, open a new PowerShell window and run:
   ```powershell
   node -v
   npm -v
   ```
   You should see the installed Node.js and npm versions.
#### 4.PowerShell Set
1. To allow the powershell to execute `.ps1` scripts, run command `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` to temporary set current terminal allows to execute the `.ps1` scripts.
2. If you hope to change forever, execute the command `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` with admin permission.
> **Note:** All installations require administrator privileges. If you encounter permission issues, right-click the installer and select "Run as administrator."

---

## Quickstart (recommended)

1. Ensure the prerequire environment is complete
2. Manully start the docker desktop
3. Prepare the `.env.local` for frontend(Refer to [Front end](#3-frontend-nextjs))
4. Open PowerShell in the project root and run:

   ```powershell
   .\scripts\start-all.ps1 [-ResetData] [-SkipSeed] [-DockerDir C:\CustomPath]
   ```

   - `-ResetData` wipes existing database files before starting Percona.
   - `-SkipSeed` skips running `TestAccountSeeder` if you already have data.
   - `-DockerDir` stores the MySQL data/keyring in a custom parent directory (the script creates `<DockerDir>\docker`).
   

5. The script launches database, backend, and frontend in dedicated PowerShell windows, installs missing Node dependencies, generates seed data (unless skipped), and waits for the Percona container to be healthy.
6. When the final window reports success, browse to `http://localhost:3000`. Default test accounts are printed in the launcher window.
7. To stop everything, you have to stop the terminals manully.


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
- If you hope to restrict listening to localhost, add `server.address = 127.0.0.1` to application.properties or release the comment.

#### BackEnd GATEWAY_SHARED_SECRET Configuration Instructions

- Spring Boot will use `GATEWAY_SHARED_SECRET` environment variable or `app.gateway.shared-secret` inject the same HMAC key to `GateWayConfig`。
- Temporarily set environment variables and start the backend:

```powershell
$env:GATEWAY_SHARED_SECRET = "<your-secret>"
.\mvnw spring-boot:run
```

- or you can set launch parameters in  `src/resources/application.properties` 

- The HMAC key must keep consitent with the key in frontend.

### 3. Frontend (Next.js)

```powershell
cd <project-root>/frontend
npm install            # first time only
copy .env.local.example .env.local  # if you keep a template
# or create .env.local manually:
# NEXT_PUBLIC_API_URL=http://127.0.0.1:3335
# GATEWAY_SHARED_SECRET=<same as backend>

#We provide the test GATEWAY_SHARED_KEY in src/resources/application.yml. Or you can replace the both key with your own one.

npm run dev
```

  
#### FrontEnd GATEWAY_SHARED_SECRET Configuration Instructions

- Next.js Server will load HMAC key by `process.env.GATEWAY_SHARED_SECRET`
-We defualtly stored the key in `.env.local` which is easy for loacl debug.
- If you hope to use environment variable, you can use the powershell as fellow:

```powershell
$env:GATEWAY_SHARED_SECRET = "<your-secret>"
npm run dev
```
- Please ensure the key is consistent with the backend.

- The frontend proxy forwards `/API/*` calls to the backend at `127.0.0.1:3335`. Adjust `NEXT_PUBLIC_API_URL` only if the backend is on another host.

### 4. Access & Shutdown

- Access the UI at `http://localhost:3000` (or `http://<host-ip>:3000` after opening the port in Windows Firewall).
- Stop individual services manually (Ctrl+C).

---

## Troubleshooting

- **Docker not detected / stuck in "waiting"**: Start Docker Desktop manually, then rerun the script. `start-all.ps1` times out after five minutes; if it fails, check Docker Desktop logs.
- **Ports already in use (3000/3335/3306)**: Release them before launching. Use `Get-NetTCPConnection -LocalPort <port>` to find the owning PID, then `Stop-Process -Id <pid> -Force` or use `Windows Task manager`if needed.
- **Script execution blocked**: PowerShell may show `annot be loaded because running scripts is disabled on this system.`. Use the execution-policy commands listed in the prerequisites section.
- **Percona container loops or keeps crashing**: Rerun `setup-percona.ps1 -ResetData` to clear corrupted volumes, or inspect logs via `docker logs comp3335-db`.
- **Backend fails to connect to DB**: Confirm `comp3335-db` is `Running`, port `3306` is reachable, and credentials in `src/main/resources/application.properties` match `root/!testCOMP3335` (or whichever values you changed).
- **Frontend cannot reach API**: Ensure `.env.local` points to a reachable backend URL and both `GATEWAY_SHARED_SECRET` values (frontend and backend) match; restart `npm run dev` after edits.
- **Need to relocate Docker data**: Use `-DockerDir D:\COMP3335Data` on either script. The helper will create `D:\COMP3335Data\docker\data` and `keyring` so large database files do not live inside the repo.
- **rsa routines::data too large for modulus**: Frontend has Hot-reload. The rsa key for OAEP has reset.
Restar the frontend will solve this problem.

Stop all the process manully and then the relevant start script again after resolving any of the issues above to ensure all processes reload cleanly.


---

**If you encounter any unexpected errors that cannot be resolved by following the above steps, it is recommended to delete the project folder and extract (or clone) it again, then repeat the setup process from the beginning. This can help resolve issues caused by incomplete extraction, accidental file modification, or corrupted dependencies.**

