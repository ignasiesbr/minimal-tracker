API to run the minimal-tracker app.

To make it work:

1 - run npm install in the folder to install all the dependencies.

2- Create a .env file that contains the following:
  MONGOURI = "your MongoDb URI"
  PORT = "the desired port"
  JWT_SECRET = "your secret for jwt"
  EMAIL_ADDRESS = "an email adress to use the reset password service"
  EMAIL_PASSWORD = "the password of the email".
  
3 - run: npm run server
  To start the server.
 
 
