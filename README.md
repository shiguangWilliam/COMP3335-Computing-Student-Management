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