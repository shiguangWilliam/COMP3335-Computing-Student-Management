package users;

public class Guardian extends User {
    static String[] normalAttributes = new String[]{"id","last_name","first_name"};
    static String[] encryptedAttributes = new String[]{"email","phone"};
    public Guardian(String ID) {
        super(ID);
        this.type = "Guardian";
    }
}
