# Indian food photo recognition

The camera and photo-library flow uses Gemini's existing pretrained vision model through the backend. It recognizes dishes from Indian cuisine (including regional foods and mixed thalis), and returns estimated nutrition for **one standard serving per distinct dish**. This is an integration with a hosted model, not a newly trained or bundled offline model. There is no guarantee of identifying every Indian dish correctly.

## Enable live recognition

1. Create an API key in [Google AI Studio](https://aistudio.google.com/apikey) for a project with Gemini API access and available quota.
2. Set `GEMINI_API_KEY` in the **backend's** environment (Railway Variables in production). The existing default is `GEMINI_MODEL=gemini-3.6-flash`; set another image-capable model with structured-output support if your project requires it. See [Google's current model list](https://ai.google.dev/gemini-api/docs/models).
3. Redeploy the backend and use the updated Android build or PWA web export. Never put the API key in Expo public environment variables or Git.

For local backend development, the ignored `backend/application-local.properties` can contain:

```properties
app.gemini.api-key=<your private API key>
app.gemini.model=gemini-3.6-flash
```

Only the photo and generic meal context are sent to Gemini; the frontend never receives the API key. Internet access and provider quota are required. There is no automatic retry of paid analysis calls.

## Result and portion behavior

The authenticated multipart endpoint remains `POST /api/meals/analyze` (`image`, `category`). Existing top-level name/nutrition fields remain available. The response also contains `items`, `portionBasis=STANDARD_SERVING_PER_DISH`, and a review warning.

Each item has a dish name, household serving label, cooked edible weight, calories, protein, carbs, fat, visible ingredients and a rough recognition score. The backend validates numeric ranges and basic consistency, removes repeated dish names, and computes totals from the item values instead of accepting model-generated totals. A recognition score is not a calibrated accuracy percentage and is not displayed as one.

The model is instructed to use app serving conventions, such as one medium roti (30 g cooked), rice/dal/curry (one 150 g katori), biryani (one 250 g bowl), or two medium idlis (100 g). These are explicit app defaults, not measured quantities inferred from a photograph. Other dishes use a typical household serving stated by the model. Users can adjust servings in steps of half a serving, exclude a dish by setting it to zero, and edit the final name and nutrition values before saving.

Nutrition is an approximate recipe estimate from the model, not a verified IFCT database lookup. Different recipes, cooking oil and brands change the result. The app makes no claim that the food image determines hidden ingredients, exact weight or allergens. Review is part of the ordinary save flow.

Herbalife/product photos bypass image analysis entirely. Their nutrition is entered manually using the product label and the serving actually used; any existing plan values are editable starting values. The backend also rejects product analysis requests without contacting Gemini.

Unrecognized/non-food photos, malformed model results, timeouts, missing credentials and quota/provider errors show the reason and allow manual entry. A library photo can be used without granting camera permission. The existing meal-photo posting and optimistic dashboard update remain in place.

## Validation

Automated tests use a mocked provider transport to check the actual JSON request contract and the response handling, including mixed plates, duplicate dishes, invalid nutrition, non-food photos, truncated output, unavailable credentials, quota errors and product exclusion. Frontend tests cover product bypass, all four meal types, serving totals and the manual fallback. These tests do not measure the model's recognition accuracy.

Before release, check real photos of roti/dal/rice, idli/sambar, poha, biryani, regional meals, snacks, mixed thalis and a non-food image. Confirm each visible dish appears once, serving assumptions are shown, edited totals are saved, and Herbalife entries do not make an analysis request. A live test needs a valid backend API key and provider access; it cannot be completed using mocked tests alone.

The provider contract follows [Gemini image understanding](https://ai.google.dev/gemini-api/docs/image-understanding) and [structured outputs](https://ai.google.dev/gemini-api/docs/structured-output).
