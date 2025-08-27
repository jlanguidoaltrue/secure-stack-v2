import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM_NUMBER;

export const twilioClient = accountSid && authToken ? twilio(accountSid, authToken) : null;
export const smsFromNumber = fromNumber;
