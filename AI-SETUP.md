# DS PDF Studio Tool — AI translation setup (Windows)

AI translation is optional and is not active in a fresh install. You must connect your own OpenAI-compatible provider API account. This project does not include a provider key, and a ChatGPT subscription does not automatically include API access. API usage may be billed separately by the provider.

## 1. Create the backend environment file

From `C:\xampp\htdocs\DS-PDF-Studio-Tool` run:

```cmd
copy backend\.env.example backend\.env
notepad backend\.env
```

## 2. Add the provider settings

Fill in the following values. Do not paste the API key into the React frontend or commit `backend/.env`.

```dotenv
AI_TRANSLATION_API_KEY=your_provider_api_key
AI_TRANSLATION_API_URL=https://api.openai.com/v1/chat/completions
AI_TRANSLATION_MODEL=gpt-4.1-mini
```

Use a model name that is enabled for your provider account. If you use another OpenAI-compatible service, its Chat Completions URL and model name may differ.

## 3. Configure an Indic font

The backend checks common Windows paths for Nirmala UI and Latha. If automatic detection fails, uncomment and set a font that actually exists on the PC, for example:

```dotenv
PDF_UNICODE_FONT_PATH=C:/Windows/Fonts/Nirmala.ttf
```

The selected font must contain all characters in the translated text. A Tamil-only font may not cover Hindi or Latin names/numbers.

## 4. Restart and check status

1. Stop the Python server with `Ctrl+C`.
2. Start it again using `start-production.bat` (or `start-dev.bat` for development).
3. Open the editor and enter the AI Translation & Layout panel.
4. Click **Refresh status**. Confirm that the Python API and provider API key are detected and that a Unicode font is available.
5. Select source language, target language, check the consent option, then click **Translate & preserve page layout**.

The API key remains on the local Python server. The browser only sends the PDF content when the consent checkbox is checked and translation is started.

## Common errors

- **AI provider API key required**: the key is blank, or the `backend/.env` file is missing/incorrect.
- **401/403**: provider rejected the key or the account does not have permission for the model.
- **404**: check the API URL and model name.
- **429**: provider rate/usage quota was reached.
- **504**: provider timed out; try a smaller PDF.
- **Cannot connect**: check the PC's internet connection, DNS, VPN, proxy and firewall.
- **Unicode font missing**: install/select a font that covers the target script.
- **No readable text found**: the PDF may be scanned; install Tesseract and the matching language pack before translating.
