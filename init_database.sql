USE COMP3335;
CREATE TABLE guardians(
    id VARCHAR(20) PRIMARY KEY,
    last_name VARCHAR(50) NOT NULL,
    first_name VARCHAR(50) NOT NULL
);
CREATE TABLE guardians_encrypted(
    id VARCHAR(20) PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    password_hash VARCHAR(256) NOT NULL,
    FOREIGN KEY (id) REFERENCES guardians(id)
) ENCRYPTION='Y';
CREATE TABLE students(
    id VARCHAR(20) PRIMARY KEY,
    last_name VARCHAR(50) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    enrollment_year INT NOT NULL
);
CREATE TABLE students_encrypted(
    id VARCHAR(20) PRIMARY KEY,
    gender VARCHAR(20) NOT NULL,
    identification_number VARCHAR(20) NOT NULL,
    address VARCHAR(500) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    guardian_id VARCHAR(20) NOT NULL,
    guardian_relation VARCHAR(20) NOT NULL,
    password_hash VARCHAR(256) NOT NULL,
    FOREIGN KEY (id) REFERENCES students(id),
    FOREIGN KEY (guardian_id) REFERENCES guardians(id)
) ENCRYPTION='Y';
CREATE TABLE staffs(
    id VARCHAR(20) PRIMARY KEY,
    last_name VARCHAR(50) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    department VARCHAR(100) NOT NULL,
    role CHAR(3) NOT NULL
);
CREATE TABLE staffs_encrypted(
    id VARCHAR(20) PRIMARY KEY,
    gender VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address VARCHAR(500) NOT NULL,
    identification_number VARCHAR(20) NOT NULL,
    password_hash VARCHAR(256) NOT NULL,
    FOREIGN KEY (id) REFERENCES staffs(id)
) ENCRYPTION='Y';
CREATE TABLE courses(
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);
CREATE TABLE grades(
    id VARCHAR(20) PRIMARY KEY,
    student_id VARCHAR(20) NOT NULL,
    course_id VARCHAR(20) NOT NULL,
    term CHAR(8) NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (course_id) REFERENCES courses(id)
);
CREATE TABLE grades_encrypted(
    id VARCHAR(20) PRIMARY KEY,
    grade VARCHAR(2) NOT NULL,
    comments VARCHAR(1000),
    FOREIGN KEY (id) REFERENCES grades(id)
) ENCRYPTION='Y';
CREATE TABLE disciplinary_records(
    id VARCHAR(20) PRIMARY KEY,
    student_id VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    staff_id VARCHAR(20) NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (staff_id) REFERENCES staffs(id)
);
CREATE TABLE disciplinary_records_encrypted(
    id VARCHAR(20) PRIMARY KEY,
    descriptions VARCHAR(1000) NOT NULL,
    FOREIGN KEY (id) REFERENCES disciplinary_records(id)
) ENCRYPTION='Y';