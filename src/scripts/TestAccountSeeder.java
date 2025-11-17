package scripts;

import app.Application;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import service.DBConnect;
import utils.SecurityUtils;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * 将默认测试账号写入数据库：
 * - Guardian（guardian@test.local）
 * - Student（student@test.local，关联 guardian）
 * - ARO / DRO / DBA 员工账号
 * - 样例课程 / 成绩 / 纪律记录
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
            String studentId = seedStudent(new Account("student@test.local", "Test@12345", "student", "Student", "Test"), guardianId);
            String aroId = seedStaff(new Account("aro@test.local", "Aro@12345", "ARO", "ARO", "Admin"), "Academic Registry");
            String droId = seedStaff(new Account("dro@test.local", "Dro@12345", "DRO", "DRO", "Officer"), "Discipline Office");
            seedStaff(new Account("dba@test.local", "Dba@12345", "DBA", "DBA", "Admin"), "IT Services");
            Map<String, String> courseIds = seedCourses();
            seedGrades(studentId, courseIds);
            seedDisciplinary(studentId, droId != null ? droId : aroId);
            System.out.println("==> 完成");
        } finally {
            context.close();
        }
    }

    private static String seedStudent(Account account, String guardianId) throws SQLException {
        if (exists("students_encrypted", account.email)) {
            System.out.println("student 已存在，跳过：" + account.email);
            return lookupId("students_encrypted", account.email);
        }
        if (guardianId == null) {
            throw new IllegalStateException("缺少 guardian 账号，无法创建 student");
        }
        String id = randomId();
        String salt = SecurityUtils.generateSalt();
        System.out.println("  - 创建学生 " + account.email);
        DBConnect.dbConnector.executeUpdate(
                "INSERT INTO students (id, last_name, first_name, enrollment_year) VALUES (?, ?, ?, ?)",
                new String[]{id, account.lastName, account.firstName, "2024"}
        );
        DBConnect.dbConnector.executeUpdate(
                "INSERT INTO students_encrypted (id, gender, identification_number, address, email, phone, guardian_id, guardian_relation, password_hash, salt) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                new String[]{
                        id,
                        "F",
                        "STU123456",
                        "1 University Road",
                        account.email,
                        "91234567",
                        guardianId,
                        "mother",
                        SecurityUtils.getPasswdHash(account.password, salt),
                        salt
                }
        );
        return id;
    }

    private static String seedGuardian(Account account) throws SQLException {
        if (exists("guardians_encrypted", account.email)) {
            System.out.println("guardian 已存在，跳过：" + account.email);
            return lookupId("guardians_encrypted", account.email);
        }
        String id = randomId();
        String salt = SecurityUtils.generateSalt();
        System.out.println("  - 创建监护人 " + account.email);
        DBConnect.dbConnector.executeUpdate(
                "INSERT INTO guardians (id, last_name, first_name) VALUES (?, ?, ?)",
                new String[]{id, account.lastName, account.firstName}
        );
        DBConnect.dbConnector.executeUpdate(
                "INSERT INTO guardians_encrypted (id, email, phone, password_hash, salt) VALUES (?, ?, ?, ?, ?)",
                new String[]{
                        id,
                        account.email,
                        "92345678",
                        SecurityUtils.getPasswdHash(account.password, salt),
                        salt
                }
        );
        return id;
    }

    private static String seedStaff(Account account, String department) throws SQLException {
        if (exists("staffs_encrypted", account.email)) {
            System.out.println(account.role + " 已存在，跳过：" + account.email);
            return lookupId("staffs_encrypted", account.email);
        }
        String id = randomId();
        String salt = SecurityUtils.generateSalt();
        System.out.println("  - 创建员工 " + account.role + " " + account.email);
        DBConnect.dbConnector.executeUpdate(
                "INSERT INTO staffs (id, last_name, first_name, department, role) VALUES (?, ?, ?, ?, ?)",
                new String[]{id, account.lastName, account.firstName, department, account.role}
        );
        DBConnect.dbConnector.executeUpdate(
                "INSERT INTO staffs_encrypted (id, gender, email, phone, address, identification_number, password_hash, salt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                new String[]{
                        id,
                        "M",
                        account.email,
                        "93456789",
                        department + " Office",
                        (account.role + "ID12345").substring(0, Math.min(20, (account.role + "ID12345").length())),
                        SecurityUtils.getPasswdHash(account.password, salt),
                        salt
                }
        );
        return id;
    }

    private static Map<String, String> seedCourses() throws SQLException {
        record Course(String id, String name) {}
        Course[] courses = {
                new Course("CS101", "Introduction to Programming"),
                new Course("MATH201", "Discrete Mathematics"),
                new Course("SEC301", "Cybersecurity Fundamentals")
        };
        Map<String, String> map = new HashMap<>();
        for (Course course : courses) {
            if (existsById("courses", course.id())) {
                System.out.println("course 已存在，跳过：" + course.id());
            } else {
                DBConnect.dbConnector.executeUpdate(
                        "INSERT INTO courses (id, name) VALUES (?, ?)",
                        new String[]{course.id(), course.name()}
                );
                System.out.println("  - 创建课程 " + course.id() + " / " + course.name());
            }
            map.put(course.id(), course.name());
        }
        return map;
    }

    private static void seedGrades(String studentId, Map<String, String> courseIds) throws SQLException {
        if (studentId == null || courseIds.isEmpty()) return;
        record GradeData(String courseId, String term, String grade, String comments) {}
        GradeData[] grades = {
                new GradeData("CS101", "2024Sem1", "A+", "Excellent performance"),
                new GradeData("MATH201", "2024Sem1", "A-", "Solid understanding"),
                new GradeData("SEC301", "2024Sem1", "A", "Great progress")
        };
        for (GradeData g : grades) {
            if (!courseIds.containsKey(g.courseId())) continue;
            ResultSet rs = DBConnect.dbConnector.executeQuery(
                    "SELECT id, encrypted_id FROM grades WHERE student_id = ? AND course_id = ? AND term = ?",
                    new String[]{studentId, g.courseId(), g.term()}
            );
            if (rs.next()) {
                String encryptedId = rs.getString("encrypted_id");
                DBConnect.dbConnector.executeUpdate(
                        "UPDATE grades_encrypted SET grade = ?, comments = ? WHERE id = ?",
                        new String[]{g.grade(), g.comments(), encryptedId}
                );
                System.out.println("  - 更新成绩 " + g.courseId());
            } else {
                String gradeId = randomId();
                String encryptedId = randomId();
                DBConnect.dbConnector.executeUpdate(
                        "INSERT INTO grades_encrypted (id, grade, comments) VALUES (?, ?, ?)",
                        new String[]{encryptedId, g.grade(), g.comments()}
                );
                DBConnect.dbConnector.executeUpdate(
                        "INSERT INTO grades (id, encrypted_id, student_id, course_id, term) VALUES (?, ?, ?, ?, ?)",
                        new String[]{gradeId, encryptedId, studentId, g.courseId(), g.term()}
                );
                System.out.println("  - 创建成绩 " + g.courseId());
            }
        }
    }

    private static void seedDisciplinary(String studentId, String staffId) throws SQLException {
        if (studentId == null || staffId == null) return;
        record Disciplinary(String date, String description) {}
        Disciplinary[] records = {
                new Disciplinary("2024-03-10", "Late submission warning"),
                new Disciplinary("2024-04-18", "Missed mandatory workshop")
        };
        for (Disciplinary rec : records) {
            ResultSet rs = DBConnect.dbConnector.executeQuery(
                    "SELECT id FROM disciplinary_records WHERE student_id = ? AND date = ?",
                    new String[]{studentId, rec.date()}
            );
            if (rs.next()) {
                System.out.println("  - 纪律记录已存在：" + rec.date());
                continue;
            }
            String rid = randomId();
            DBConnect.dbConnector.executeUpdate(
                    "INSERT INTO disciplinary_records (id, student_id, date, staff_id) VALUES (?, ?, ?, ?)",
                    new String[]{rid, studentId, rec.date(), staffId}
            );
            DBConnect.dbConnector.executeUpdate(
                    "INSERT INTO disciplinary_records_encrypted (id, descriptions) VALUES (?, ?)",
                    new String[]{rid, rec.description()}
            );
            System.out.println("  - 创建纪律记录 " + rec.date());
        }
    }

    private static boolean exists(String table, String email) throws SQLException {
        ResultSet rs = DBConnect.dbConnector.executeQuery(
                "SELECT COUNT(*) AS cnt FROM " + table + " WHERE email = ?",
                new String[]{email}
        );
        return rs.next() && rs.getInt("cnt") > 0;
    }

    private static boolean existsById(String table, String id) throws SQLException {
        ResultSet rs = DBConnect.dbConnector.executeQuery(
                "SELECT COUNT(*) AS cnt FROM " + table + " WHERE id = ?",
                new String[]{id}
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

