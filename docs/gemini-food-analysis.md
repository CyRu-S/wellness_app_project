# Food photo analysis

The member photo flow calls `POST /api/meals/analyze`, which sends one image in one request to Gemini `gemini-3.1-flash-lite`. Only the image and a short fixed instruction are sent, without member account details, plan history or chat history.

## Configuration

In the Git-ignored `backend/application-local.properties`, fill in:

```properties
app.gemini.api-key=YOUR_GEMINI_API_KEY
app.gemini.model=gemini-3.1-flash-lite
```

Alternatively leave `app.gemini.api-key=${GEMINI_API_KEY:}` and set `GEMINI_API_KEY` in the backend environment. Deployments can also set `GEMINI_MODEL`. Restart the backend after changing configuration. Never put the key in an Expo public environment variable or frontend code. No Ollama service or model download is required for the app's photo flow.

## Cost and nutrition behavior

- One `generateContent` request per food photo, with no automatic retries, grounding or tools.
- Authentication and an enabled account are required. Uploads are limited to 10 MB with matching JPEG/PNG/WebP signatures; the app converts camera/library images to JPEG before uploading. At most four Gemini requests run concurrently. Each backend instance allows six requests per minute and 60 per UTC day per account (`GEMINI_REQUESTS_PER_MINUTE` / `GEMINI_REQUESTS_PER_DAY`). Counters reset on restart and are not a billing cap or shared between replicas; provider quotas still apply.
- Medium image resolution, `MINIMAL` thinking, one candidate and a 768-token output limit. The short prompt and compact schema target roughly 1,000–1,500 total tokens per normal food photo, including image input and output. This is an unmeasured target until verified with real images: the API does not offer a combined input/output ceiling, and actual usage varies. Backend logs record the provider's input, output, thinking and total token counts without photo contents or credentials.
- Gemini returns only an `items` array of short dish names, estimated total edible portion weight per dish and protein/carbs/fat grams per 100 g, with null nutrients for unknown nutrition. No explanations, ingredients, confidence scores or duplicated totals are generated. Java scales nutrients to the estimated portion, calculates calories as protein × 4 + carbs × 4 + fat × 9, validates values and removes duplicate dishes. Existing besan laddu references are preserved. The app displays the nutrition fields directly; no AI prose needs parsing.
- Gemini estimates the visible total serving weight of each dish, including all visible pieces. It uses a typical standard serving when size is unclear. The API returns ESTIMATED_PORTION nutrition and the app displays totals immediately; no food-weight input is required. Members may correct serving nutrition or remove mistaken foods. Portion size and nutrition are estimates, not measurements.
- Missing configuration, unavailable quota, rejected/non-food images, timeouts and invalid responses leave editable manual entry available. Starter values in this fallback are explicitly identified for review.

The request contract follows Google's [model documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite) and [generateContent API reference](https://ai.google.dev/api/generate-content).

## Herbalife calories

These apply only when the assigned meal category is Product, Herbalife or Herbalife product:

| Product name | kcal |
| --- | ---: |
| Afresh | 4 |
| Shake | 220 |
| Hydrate | 14 |
| Beta heart | 47.5 |
| Rebuild | 174.75 |
| Liftoff | 13.39 |

Matching is case insensitive and ignores emoji, spaces and punctuation, including inside a product name. Extra admin text is allowed. Combined names add each recognized product once: `Afresh + Shake` is 224 kcal. Ordinary food categories do not inherit product values when a dish name contains “shake”. Unlisted Herbalife products show the prepared photo with Retake and Add to dashboard actions before saving. No nutrition values or entry fields are shown, and these check-ins contribute zero to calorie and macro totals. Mixed names count only the recognized products.

Recognized products skip Gemini, serving-weight scaling and editable nutrition. Their capture and photo detail screens show calories only. The backend enforces the same mapping using the assigned category/name so client-supplied calories cannot override it. Macronutrients are not estimated; zero values are stored for the existing required numeric fields and contribute nothing to macro totals. Decimal calories are retained in meal posts and dashboard totals; the legacy integer daily-meal cache is rounded.

## Verification

Run `mvn -f backend/pom.xml test`, `npm --prefix frontend test` and `npm --prefix frontend run lint`. Mocked Gemini HTTP tests cover the request contract, non-food, missing nutrition, invalid/truncated responses, quota/auth failures and connection recovery. Integration tests cover fixed-product persistence and decimal dashboard totals. A real recognition check requires adding your API key and uploading representative food photos; automated tests do not spend API quota.
