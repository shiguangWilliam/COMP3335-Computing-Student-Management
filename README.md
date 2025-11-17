# 后端（Spring Boot + Maven）傻瓜式使用指南

适用于 Windows，已内置 Maven Wrapper（无需安装 Maven）。只看“一分钟启动”即可跑起来。

## 一分钟启动
- 在项目根目录打开终端：`C:\...\COMP3335-Computing-Student-Management`
- 启动开发服务器：`.\n+mvnw spring-boot:run`
- 打开浏览器：`http://localhost:3335/`（没有接口时看到 404 也表示服务已启动）

## 打包运行
- 构建可运行 Jar：`.
mvnw -U clean package`
- 运行 Jar：`java -jar target\comp3335-0.0.1-SNAPSHOT.jar`

## 必备环境
- 安装 JDK 21（OpenJDK/Adoptium/Oracle 均可）
- 验证：`java -version` 应显示 `21`（或兼容版本）
- 无需安装 Maven，直接使用仓库中的 `mvnw` 即可

## 配置说明
- 端口：在 `src/main/resources/application.properties` 中设置
  - `server.port=3335`
- 数据库（MySQL）：准备好后添加以下配置并删除临时禁用行
  - 添加：
    - `spring.datasource.url=jdbc:mysql://<host>:<port>/<db>?useSSL=false&serverTimezone=UTC`
    - `spring.datasource.username=<your_user>`
    - `spring.datasource.password=<your_password>`
  - 删除：`spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration`

## 目录结构（核心）
- `src/main/java/Application.java`（启动类）
- `src/main/java/http/`（控制器/路由）
- `src/main/java/service/`（服务层）
- `src/main/java/repository/`（数据访问层，后续可加）
- `src/main/java/users/`（领域模型/实体）
- `src/main/java/utils/`（工具类）
- `src/main/resources/application.properties`（配置）

## 在 IntelliJ IDEA（社区版）中使用
- 直接用 `Open` 打开项目目录，IDE 会识别 `pom.xml`
- 在右侧 Maven 面板点击刷新（Load Maven Changes）
- Project Structure → SDK 选择 `JDK 21`
- 运行：找到 `Application` 的运行配置或使用 Maven 面板的 `spring-boot:run`

## 常见问题（快速排查）
- 依赖下载慢或失败：新增用户级 `settings.xml` 启用国内镜像
  - 路径：`%USERPROFILE%\.m2\settings.xml`
  - 内容示例：
    ```xml
    <settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"
              xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
              xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.0.0 https://maven.apache.org/xsd/settings-1.0.0.xsd">
      <mirrors>
        <mirror>
          <id>aliyun</id>
          <name>Aliyun Maven</name>
          <url>https://maven.aliyun.com/repository/public</url>
          <mirrorOf>*</mirrorOf>
        </mirror>
      </mirrors>
    </settings>
    ```
- 提示 `JAVA_HOME not found`：系统环境变量设置 `JAVA_HOME` 指向 JDK 安装目录（例如 `C:\Program Files\Java\jdk-21`），并把 `%JAVA_HOME%\bin` 加入 `PATH`
- 端口被占用：修改 `application.properties` 中的 `server.port`
- 本地 `lib/mysql-connector-j-*.jar` 冲突：不要手动引入本地 Jar；使用 `pom.xml` 的 Maven 依赖即可（必要时在 IDE 中移除 `.idea/libraries/lib.xml` 的本地库引用）

## 有用命令
- 查看 Maven Wrapper 版本：`.
mvnw -v`
- 只编译不运行：`.
mvnw clean compile`
- 查看依赖树：`.
mvnw dependency:tree`

## 说明
- 项目已配置 Spring Boot 主类为 `Application`，`spring-boot-maven-plugin` 会在打包时自动生成可运行的 Jar。
- 首次开发阶段如果还未配置数据库，已临时禁用了数据源自动配置，等你补齐数据库配置后删掉对应行即可。

## 数据库部署（Windows + Docker）

下面步骤可直接在 PowerShell 中复制粘贴，最终会启动一个启用 Keyring 的 Percona Server 并自动执行 `init_database.sql`。

1. **准备工具**
   - 安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/)
   - 打开 PowerShell，切换到项目根目录：`cd D:\Homework\COMP3335\Project`
2. **创建持久化目录与配置**
   ```powershell
   if(!(Test-Path docker)){New-Item -ItemType Directory docker | Out-Null}
   if(!(Test-Path docker\data)){New-Item -ItemType Directory docker\data | Out-Null}
   if(!(Test-Path docker\keyring)){New-Item -ItemType Directory docker\keyring | Out-Null}
   if(!(Test-Path docker\my.cnf)){
@"
[mysqld]
early-plugin-load=keyring_file.so
keyring_file_data=/keyring/keyring
"@ | Set-Content -Encoding UTF8 docker\my.cnf
   }
   ```
   > 如果 `docker\my.cnf` 已存在，请确认内容同上
3. **启动容器（第一次会自动初始化数据库）**
   ```powershell
   docker run `
     --name comp3335-db `
     -p 3306:3306 `
     -p 33060:33060 `
     -e MYSQL_ROOT_PASSWORD=!testCOMP3335 `
     -e MYSQL_DATABASE=COMP3335 `
     -v ${PWD}\docker\data:/var/lib/mysql `
     -v ${PWD}\docker\keyring:/keyring `
     -v ${PWD}\init_database.sql:/docker-entrypoint-initdb.d/init_database.sql `
     percona/percona-server:latest `
     --early-plugin-load=keyring_file.so `
     --keyring_file_data=/keyring/keyring
   ```
   - 初次运行日志出现 `MySQL init process done` 即表示成功
   - 若需重置数据库：`docker rm -f comp3335-db`，然后清空 `docker\data`、`docker\keyring` 再重新运行上述命令
   - **自动脚本**：运行 `.\scripts\setup-percona.ps1`（加 `-ResetData` 参数可在重启前清空数据）
4. **验证状态**
   ```powershell
   docker ps --filter "name=comp3335-db"
   docker exec -it comp3335-db mysql -uroot -p!testCOMP3335 -e "SHOW DATABASES;"
   ```
5. **后端连接**
   - JDBC：`jdbc:mysql://localhost:3306/COMP3335`
   - 用户：`root`
   - 密码：`!testCOMP3335`
   - 如需使用 Spring DataSource，参考前文“配置说明”中的 `spring.datasource.*`
6. **常见问题**
   - `Encryption can't find master key`：确保 `--early-plugin-load` 与 `--keyring_file_data` 参数存在，且 `docker\keyring` 目录已挂载
   - 端口冲突：将 `-p 3306:3306` 改为其他端口（例如 `-p 3307:3306`），并同步修改应用配置

## 写入默认测试账号

项目提供 `scripts.TestAccountSeeder` 用于把默认账号（student / guardian / ARO / DRO / DBA）写入数据库：

```powershell
mvnw --% -q compile exec:java -Dexec.mainClass=scripts.TestAccountSeeder
```

- 多次运行会跳过已存在的邮箱
- Guardian 账号会自动与 student 账号建立监护关系
 - 会一并创建示例课程（CS101/MATH201/SEC301）及对应成绩、纪律记录
- 如需彻底重置，可配合 `scripts/setup-percona.ps1 -ResetData`