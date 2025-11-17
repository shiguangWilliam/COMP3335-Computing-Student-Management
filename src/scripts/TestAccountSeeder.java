package scripts;

import app.Application;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import service.DBConnect;
import utils.SecurityUtils;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.UUID;

/**
 * 将默认测试账号写入数据库：
 * - Guardian（guardian@test.local）
 * - Student（student@test.local，关联 guardian）
 * - ARO / DRO / DBA 员工账号
 *
 * 使用方法（项目根目录）：
 *   mvnw --% -q compile exec:java -Dexec.mainClass=scripts.TestAccountSeeder
 * 或者在 IDE 中运行本类的 main。
 */
public class TestAccountSeeder {

    private record Account(String email, String password, String role, String firstName, String lastName) {}

    public static void main(String[] args) throws Exception {
        SpringApplicationBuilder builder = new SpringApplicationBuilder(Application.class);
        builder.web(WebApplicationType.NONE);
        ConfigurableApplicationContext context = builder.run();
        try {
            System.out.println("==> 开始写入默认账号");
            String guardianId = seedGuardian(new Account("guardian@test.local", "Guardian@12345", "guardian", "Guardian", "User"));
            seedStudent(new Account("student@test.local", "Test@12345", "student", "Student", "Test"), guardianId);
            seedStaff(new Account("aro@test.local", "Aro@12345", "ARO", "ARO", "Admin"), "Academic Registry");
            seedStaff(new Account("dro@test.local", "Dro@12345", "DRO", "DRO", "Officer"), "Discipline Office");
            seedStaff(new Account("dba@test.local", "Dba@12345", "DBA", "DBA", "Admin"), "IT Services");
            System.out.println("==> 完成");
        } finally {
            context.close();
        }
    }

    private static void seedStudent(Account account, String guardianId) throws SQLException {
        if (exists("students_encrypted", account.email)) {
            System.out.println("student 已存在，跳过：" + account.email);
            return;
        }
        if (guardianId == null) {
            throw new IllegalStateException("缺少 guardian 账号，无法创建 student");
        }
        String id = randomId();
        System.out.println("  - 创建学生 " + account.email);
        DBConnect.dbConnector.executeUpdate(
                "INSERT INTO students (id, last_name, first_name, enrollment_year) VALUES (?, ?, ?, ?)",
                new String[]{id, account.lastName, account.firstName, "2024"}
        );
        DBConnect.dbConnector.executeUpdate(
                "INSERT INTO students_encrypted (id, gender, identification_number, address, email, phone, guardian_id, guardian_relation, password_hash) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                new String[]{
                        id,
                        "F",
                        "STU123456",
                        "1 University Road",
                        account.email,
                        "91234567",
                        guardianId,
                        "mother",
                        SecurityUtils.getPasswdHash(account.password)
                }
        );
    }

    private static String seedGuardian(Account account) throws SQLException {
        if (exists("guardians_encrypted", account.email)) {
            System.out.println("guardian 已存在，跳过：" + account.email);
            return lookupId("guardians_encrypted", account.email);
        }
        String id = randomId();
        System.out.println("  - 创建监护人 " + account.email);
        DBConnect.dbConnector.executeUpdate(
                "INSERT INTO guardians (id, last_name, first_name) VALUES (?, ?, ?)",
                new String[]{id, account.lastName, account.firstName}
        );
        DBConnect.dbConnector.executeUpdate(
                "INSERT INTO guardians_encrypted (id, email, phone, password_hash) VALUES (?, ?, ?, ?)",
                new String[]{
                        id,
                        account.email,
                        "92345678",
                        SecurityUtils.getPasswdHash(account.password)
                }
        );
        return id;
    }

    private static void seedStaff(Account account, String department) throws SQLException {
        if (exists("staffs_encrypted", account.email)) {
            System.out.println(account.role + " 已存在，跳过：" + account.email);
            return;
        }
        String id = randomId();
        System.out.println("  - 创建员工 " + account.role + " " + account.email);
        DBConnect.dbConnector.executeUpdate(
                "INSERT INTO staffs (id, last_name, first_name, department, role) VALUES (?, ?, ?, ?, ?)",
                new String[]{id, account.lastName, account.firstName, department, account.role}
        );
        DBConnect.dbConnector.executeUpdate(
                "INSERT INTO staffs_encrypted (id, gender, email, phone, address, identification_number, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?)",
                new String[]{
                        id,
                        "M",
                        account.email,
                        "93456789",
                        department + " Office",
                        (account.role + "ID12345").substring(0, Math.min(20, (account.role + "ID12345").length())),
                        SecurityUtils.getPasswdHash(account.password)
                }
        );
    }

    private static boolean exists(String table, String email) throws SQLException {
        ResultSet rs = DBConnect.dbConnector.executeQuery(
                "SELECT COUNT(*) AS cnt FROM " + table + " WHERE email = ?",
                new String[]{email}
        );
        return rs.next() && rs.getInt("cnt") > 0;
    }

    private static String lookupId(String table, String email) throws SQLException {
        ResultSet rs = DBConnect.dbConnector.executeQuery(
                "SELECT id FROM " + table + " WHERE email = ?",
                new String[]{email}
        );
        if (rs.next()) {
            return rs.getString("id");
        }
        return null;
    }

    private static String randomId() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 20);
    }
}

