import Brevo from 'sib-api-v3-sdk';

const apiKey = Brevo.ApiClient.instance.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_CONTACTS;


export const addContactToBrevo = async (email: string, firstName: string, lastName: string) => {
    const apiInstance = new Brevo.ContactsApi();
  
    const createContact = new Brevo.CreateContact();
    createContact.email = email;
    createContact.attributes = {
      FIRSTNAME: firstName,
      LASTNAME: lastName,
    };
    createContact.listIds = [7]; // Specify the list ID for promotional emails
    createContact.updateEnabled = true; // Update the contact if they already exist
  
    try {
      const response = await apiInstance.createContact(createContact);
      console.log('Contact added to Brevo:', response);
    } catch (error) {
      console.error('Error adding contact to Brevo:', error);
    }
  };
  