package utils;

import java.time.DateTimeException;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

public class ParamValid {
    public static boolean isValidEmail(String email){
        if(email == null || email.isBlank()){
            return false;
        }
        if(email.length() > 254){
            return false;
        }
        String regex = "^[A-Za-z0-9_]+(?:\\.[A-Za-z0-9_]+)*@[A-Za-z0-9_]+(?:\\.[A-Za-z0-9_]+)+$";
        return email.matches(regex);
    }

    public static boolean isValidPassword(String password){
        if(password == null || password.isBlank()){
            return false;
        }
        if(password.length() < 8 || password.length() > 72){
            return false;
        }
        String regex = "^[A-Za-z0-9_*@]+$";
        return password.matches(regex);
    }

    public static boolean isValidUsername(String username){
        if(username == null || username.isBlank()){
            return false;
        }
        if(username.length() > 50){
            return false;
        }
        String regex = "^[A-Za-z]+$";
        return username.matches(regex);
    }

    public static boolean isValidPhone(String phone){
        if(phone == null || phone.isBlank()){
            return false;
        }
        if(phone.length() > 11){
            return false;
        }
        String regex = "^[0-9]+$";
        return phone.matches(regex);
    }

    public static boolean isValidCourseID(String courseID){
        if(courseID == null || courseID.isBlank()){
            return false;
        }
        if(courseID.length() > 10){
            return false;
        }
        String regex = "^[A-Za-z0-9_]+$";
        return courseID.matches(regex);
    }

    public static boolean isValidCourseName(String courseName){
        if(courseName == null || courseName.isBlank()){
            return false;
        }
        if(courseName.length() > 50){
            return false;
        }
        String regex = "^[A-Za-z0-9_]+$";
        return courseName.matches(regex);
    }

    public static boolean isValidAddress(String address){
        if(address == null || address.isBlank()){
            return false;
        }
        if(address.length() > 255){
            return false;
        }
        String regex = "^[A-Za-z0-9_\\s]+$"; //额外允许空白字符
        return address.matches(regex);
    }

    public static boolean isValidGender(String gender){
        if(gender == null || gender.isBlank()){
            return false;
        }
        if(gender.length() > 1){
            return false;
        }
        String regex = "^[MFmf]$";
        return gender.matches(regex);
    }

    public static boolean isValidEnrollmentYear(String year){
        if(year == null || year.isBlank()){
            return false;
        }
        if(year.length() != 4){
            return false;
        }
        String regex = "^[0-9]+$";
        return year.matches(regex);
    }

    public static boolean isValidIdentityNum(String identityNum){
        if(identityNum == null || identityNum.isBlank()){
            return false;
        }
        if(identityNum.length() != 10){
            return false;
        }
        String regex1 = "^[A-Z][0-9]{6}\\([0-9A]\\)$";//香港身份证
        return identityNum.matches(regex1);
    }

    public static boolean isValidDate(String date){
        try{
            LocalDate.parse(date);
            return true;
        }
        catch(DateTimeException e){
            return false;
        }
    }

    public static boolean isValidString(String str){
        if(str == null || str.isBlank()){
            return false;
        }
        String regex = "^[A-Za-z0-9_\\s.,]+$";
        return str.matches(regex);
    }

    public static boolean isValidGrade(String grade){
        if(grade == null || grade.isBlank()){
            return false;
        }
        List<String> validGrades = Arrays.asList("A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F");
        return validGrades.contains(grade);
    }

    public static boolean isValidTerm(String term){
        if(term == null || term.isBlank()){
            return false;
        }
        String regex = "^(20\\d{2})Sem(1|2)$";
        return term.matches(regex);
    }
}
