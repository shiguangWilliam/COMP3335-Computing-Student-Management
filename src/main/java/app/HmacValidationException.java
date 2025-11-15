package app;

public class HmacValidationException extends Exception{
    private final int statusCode;

    public HmacValidationException(String message,int statusCode){
        super(message);
        this.statusCode = statusCode;
    }

    public int getStatusCode(){
        return statusCode;
    }

}
