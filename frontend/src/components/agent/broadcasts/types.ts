export interface WhatsAppConfig {
  business_account_id: string;
  phone_number_id: string;
  api_key: string;
}

export interface MetaTemplate {
  name: string;
  language: string;
  category: string;
  status: string;
  components: Array<{
    type: string;
    text?: string;
    format?: string;
  }>;
}
