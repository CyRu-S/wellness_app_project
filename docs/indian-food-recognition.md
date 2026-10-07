# Self-hosted Indian food recognition

Recognition runs in a downloaded Qwen3-VL vision model through **your own Ollama service**. There is no Gemini dependency, AI API key or external-provider fallback. Android and iOS PWA call the same authenticated backend endpoint, so model weights are not bundled into either app. Internet is needed for the initial runtime/model download; inference then runs on the machine hosting Ollama. The phone still needs access to the backend.

## Development on Windows

Install [Ollama](https://ollama.com/download/windows), or use its official portable runtime. This workspace also has a project-local portable installation in `.codex-work/local-ai/runtime` and model weights in `.codex-work/local-ai/models`, kept outside Git. From the project root:

```powershell
powershell -ExecutionPolicy Bypass -File backend/scripts/start-local-food-model.ps1
```

The script starts Ollama hidden on `127.0.0.1:11434`, sets `OLLAMA_NO_CLOUD=1`, downloads `qwen3-vl:2b-instruct` if necessary, and warms up its weights. Model files persist for later starts. Existing Ollama services are not replaced or stopped. Configure the backend with:

```properties
app.food-analysis.url=http://127.0.0.1:11434
app.food-analysis.model=qwen3-vl:2b-instruct
```

These are the default values. They may also be set in the ignored `backend/application-local.properties`. To stop only a service started by the project script:

```powershell
powershell -ExecutionPolicy Bypass -File backend/scripts/stop-local-food-model.ps1
```

The first request after weights unload may take longer. GPU inference is preferred for interactive photo analysis; CPU inference works but needs latency testing. Requests have a bounded wait and the existing manual-entry fallback remains available.

## Production: one shared model service

Run Ollama as a separate always-on service with persistent model storage. Both Android and PWA use your existing HTTPS API; the Java backend makes the private connection to Ollama. Updating the model requires no mobile app rebuild. Configure the backend:

```text
FOOD_ANALYSIS_URL=http://<private-model-service>:11434
FOOD_ANALYSIS_MODEL=qwen3-vl:2b-instruct
```

If the backend and model are on different hosts (for example Railway and an Oracle VM), connect them through a private network/VPN or an authenticated TLS proxy. A Railway backend cannot reach your laptop's or an Oracle VM's loopback address. The Ollama API is not an authenticated public application endpoint; keep its port private and let the existing application backend handle user authentication.

For a protected HTTPS proxy, `FOOD_ANALYSIS_SERVICE_TOKEN` optionally adds an `X-Model-Service-Token` header. Configure the proxy to require the same random secret and reject other requests. Store it only in server deployment secrets, never frontend configuration or Git. This is authentication for your own service, not a paid AI provider key. Setting a token alone does not protect Ollama; the proxy must enforce it.

The supplied Compose service runs independently from the existing database stack:

```sh
docker compose -f docker-compose.local-ai.yml up -d ollama
docker compose -f docker-compose.local-ai.yml --profile setup run --rm model-init
```

It binds the published port to loopback and keeps models in a named volume. With NVIDIA container support, add `-f docker-compose.local-ai.gpu.yml` to both commands. The CPU configuration can run on Linux ARM64 or x86-64. Allow sufficient RAM, measure real-image latency, monitor failures and back up deployment configuration. The Java heap remains separate from model memory. Concurrent analysis is bounded; excess requests receive a busy message and users can retry or enter nutrition manually.

### Oracle Always Free VM

An Ampere A1 Linux VM can run the CPU model service. As checked on 2026-10-07, [Oracle's current Always Free documentation](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm) lists 1,500 OCPU-hours and 9,000 GB-hours monthly, equivalent to 2 OCPUs and 12 GB RAM for Always Free tenancies. It also permits idle-instance reclamation. Confirm your own tenancy's limits and regional availability before provisioning.

Use the CPU Compose file, retain the model volume, and connect the backend privately afterwards. This is a possible low-cost pilot host, not a verified performance target: two CPU cores have to process the image and generate every food item. Measure a representative meal-photo batch and concurrent requests before treating it as production capacity. No Oracle account or VM is provisioned by this change.

When the VM is available:

1. In the tenancy's home region, create an Always Free-eligible Ubuntu `VM.Standard.A1.Flex` instance within your confirmed CPU, RAM and storage allowance. Save the SSH key; restrict SSH access to your own IP.
2. Install Docker Engine and Compose for the VM's ARM64 architecture. Clone the repository's `backend` branch and run the two CPU Compose commands above. Only the model service runs here; the app backend and database can remain on Railway.
3. Keep port 11434 closed to the public internet. Connect privately, or put an HTTPS proxy with enforced service-token authentication in front of loopback Ollama.
4. Set Railway's `FOOD_ANALYSIS_URL` to the reachable private address or protected HTTPS proxy, `FOOD_ANALYSIS_MODEL=qwen3-vl:2b-instruct`, and the optional matching service token. Redeploy the backend; neither Android nor PWA needs a model-specific rebuild.
5. Verify restart persistence, recognition latency, and behavior with concurrent meal photos. Monitor the VM and keep backups; an Always Free allocation does not guarantee uninterrupted availability.

## Food, serving and nutrition behavior

`POST /api/meals/analyze` retains its authenticated multipart contract (`image`, `category`) and existing top-level nutrition fields. It returns per-dish `items`, `portionBasis=PER_100_G` and a review warning. Each item's `portionGrams` is 100, `standardPortion` is `100 g`, and nutrients are reference values per 100 g of cooked edible food. Items also return `nutritionAvailable`, `nutritionSource` (`reference`, `estimated`, or `unavailable`) and optional `nutritionReference` text. Top-level API totals sum those references only when every item has nutrition; otherwise the nutrient fields are `null`. They are not eaten-meal totals. The frontend starts eaten weights blank and displays a dash for totals until all included foods have valid nutrition and weights.

The model first describes visible food without a nutrition schema, then estimates per-100-g macronutrients from that observation. Keeping the steps separate reduces copying of examples from nutrition instructions. The backend validates reference weights/macros, deduplicates dish names and calculates approximate energy using [general energy conversion factors](https://www.fao.org/4/Y5022E/y5022e04.htm): `4 × protein + 4 × carbs + 9 × fat` kcal. It does not estimate photographed portions.

For each detected food, the user must manually enter eaten weight in grams. Each nutrient scales as `per100gValue × eatenGrams / 100`; totals sum the included foods and round to one decimal place. For example, 160 kcal per 100 g becomes 400 kcal at 250 g. The app accepts positive weights up to 2000 g with two decimal places and either a decimal point or comma. Saving requires valid nutrition and weights for all included foods and at least one included food. Unknown nutrition keeps the detected food name, displays "Nutrition unavailable", and offers four editable per-100-g fields instead of treating missing data as zero. Manual references accept 0-1000 kcal and 0-100 g per nutrient, up to four decimal places; the three macronutrients together must not exceed 115 g. A user can edit any reference to suit their recipe. Explicitly entered zero values are accepted, while automatic all-zero model placeholders are unavailable. Removing a mistaken food removes it from the saved meal name and totals; restoring it retains its entered weight. The saved meal stores the calculated total nutrition. Herbalife and unavailable-recognition entries retain editable manual nutrition fields.

Most nutrition is a local model's approximate recipe estimate, not a validated IFCT/database lookup. A small offline reference covers common laddu/ladoo/laddoo spellings and besan laddu. It uses [Haldiram's published approximate besan ladoo values](https://www.haldirams.com/product/premium-sweets/besan-ladoo-250-gms): 506 kcal, 8.4 g protein, 63.42 g carbs and 24.32 g fat per 100 g. This is a representative recipe reference, not identification of that brand or proof of the photographed recipe; the food card explicitly labels it as besan and allows editing. Coconut, ragi and motichoor laddu do not inherit besan values. Reference energy is the published value, rather than recalculated from rounded macros. A comprehensive cooked-food nutrient catalogue is not bundled. Regional recipes and cooking oil vary, and recognition of every Indian dish is not guaranteed. Unavailable recognition or invalid model responses go to manual entry. A valid response can still misidentify foods: users must review names and remove wrong detections before saving.

Herbalife photos bypass the local model. Product nutrition is entered manually from the label and actual serving, with editable plan values as starting values. Non-food photos, unavailable models and timeouts also retain manual entry.

## Verification and model licensing

Automated tests cover the real local HTTP/JSON contract without credentials, response validation, mixed plates, duplicate foods, unavailable nutrition, laddu references and spelling aliases, manual nutrition correction, portion scaling, missing/cloud models, busy inference and manual Herbalife entry. The test transport is mocked; separate real-model checks are needed to measure food-recognition accuracy. Keep a representative validation set of breakfast, lunch, dinner, snacks, regional dishes, mixed thalis and non-food images before launch.

An explicit check sends an actual JPEG to the configured runtime without requiring it in CI:

```sh
mvn -f backend/pom.xml -Dtest=LocalFoodModelSmoke -DlocalFoodImage=/path/to/meal.jpg -DexpectedFoods=idli,chutney test
```

On 2026-10-07, a resized [idli/chutney meal photo](https://commons.wikimedia.org/wiki/File:Idli_with_sambar_and_chutney.jpg) returned `Idli, Chutney, Sauce` with per-100-g values in about 4.7 seconds on this workspace's RTX 4050 laptop. Photo: Shafana jasmine, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); resized for a local check, not bundled. This verifies runtime integration, not nutrient accuracy or a recognition score. An earlier dark, obscured idli/sambar photo was misidentified, and the clear photo's sauce remained generic. These limitations must be included when evaluating the model before production; Oracle CPU speed and concurrency have not been measured.

A resized [besan-laddu photo](https://commons.wikimedia.org/wiki/File:Besan_Laddu.jpg) initially produced all-zero model nutrients. After improving the recognition prompt it was identified as `Laddu`, but the model still estimated only 40 kcal per 100 g. The offline besan reference now supplies the published values above, explicitly labelled in the app; a real-model check returned `Laddu` and 506 kcal per 100 g in 14.6 seconds on the same laptop. The frontend regression check calculates 202.4 kcal for a manually entered 40 g portion. Photo: Tinkesh, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); resized for a local check, not bundled. This validates the correction path for this example, not nutritional accuracy for all foods or other laddu recipes.

[Qwen3-VL 2B](https://huggingface.co/Qwen/Qwen3-VL-2B-Instruct) is an open-weight model published under Apache 2.0. The model weights include the upstream license. This project uses its pretrained weights, not a newly trained model; runtime/model files are downloaded separately rather than committed or bundled into Expo. Implementation follows [Ollama vision](https://docs.ollama.com/capabilities/vision) and [structured outputs](https://docs.ollama.com/capabilities/structured-outputs).
