# Luxe & Living — E-Commerce Store with AI Chat

A containerized e-commerce storefront mockup with streaming LLM-powered customer service chat. Designed for deployment on OpenShift and Kubernetes.

## Features

- Polished home goods storefront (products, categories, cart UI)
- **Chat Customer Service** widget with streaming responses
- OpenAI-compatible API proxy (keeps auth token server-side)
- ConfigMap-driven LLM configuration
- Health checks for Kubernetes readiness/liveness probes
- OpenShift Route and generic Ingress manifests included

## Architecture

```
Browser ──► Node.js (Express) ──► OpenAI-compatible LLM API
              │
              ├── Static storefront (HTML/CSS/JS)
              └── POST /api/chat (SSE streaming proxy)
```

The backend injects store context as a system prompt so the chatbot can answer questions about products, shipping, returns, and promotions.

## Quick Start (Local)

```bash
npm install

# Set LLM config via environment variables
export LLM_API_URL="https://maas-rhdp.apps.maas.redhatworkshops.io/v1/chat/completions"
export LLM_AUTH_TOKEN="your-bearer-token"
export LLM_MODEL="your-model-name"
export LLM_CONTENT_TYPE="application/json"

npm start
```

Open [http://localhost:8080](http://localhost:8080) and click **Chat Customer Service**.

## Configuration

All LLM settings are read from environment variables (typically mounted from a ConfigMap):

| Variable | Description | Example |
|---|---|---|
| `LLM_API_URL` | Chat completions endpoint | `https://.../v1/chat/completions` |
| `LLM_AUTH_TOKEN` | Bearer token (with or without `Bearer ` prefix) | `sk-...` or `Bearer sk-...` |
| `LLM_CONTENT_TYPE` | Request content type | `application/json` |
| `LLM_MODEL` | Model name | `llama-3.1-8b-instruct` |
| `PORT` | Server port (default `8080`) | `8080` |

> **Note:** For production, store `LLM_AUTH_TOKEN` in a Kubernetes Secret rather than a ConfigMap.

## Container Build

```bash
podman build -t luxe-living-store:latest .
# or
docker build -t luxe-living-store:latest .
```

Run locally:

```bash
podman run -p 8080:8080 \
  -e LLM_API_URL=$LLM_API_URL \
  -e LLM_AUTH_TOKEN=$LLM_AUTH_TOKEN \
  -e LLM_MODEL=$LLM_MODEL \
  luxe-living-store:latest
```

## Deploy to OpenShift

1. Edit `k8s/configmap.yaml` with your LLM endpoint, token, and model name.

2. Build and push the image to your cluster's registry:

```bash
oc new-project luxe-living
oc create -f k8s/configmap.yaml
oc create -f k8s/deployment.yaml
oc create -f k8s/service.yaml
oc create -f k8s/route.yaml
```

3. Update the deployment image to your registry:

```bash
oc set image deployment/luxe-living-store store=image-registry.openshift-image-registry.svc:5000/luxe-living/luxe-living-store:latest
```

4. Get the route URL:

```bash
oc get route luxe-living-store
```

## Deploy to Kubernetes

```bash
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml   # optional — edit host first
```

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check |
| `/api/chat/status` | GET | Whether LLM is configured |
| `/api/chat` | POST | Streaming chat (`{ "messages": [...] }`) |

## Project Structure

```
├── Dockerfile
├── package.json
├── server/
│   └── index.js          # Express server + LLM proxy
├── public/
│   ├── index.html        # Storefront
│   ├── css/styles.css
│   └── js/
│       ├── store.js      # Product rendering
│       └── chat.js       # Chat widget + SSE client
└── k8s/
    ├── configmap.yaml
    ├── deployment.yaml
    ├── service.yaml
    ├── route.yaml        # OpenShift
    └── ingress.yaml      # Generic K8s
```
Note:
Sucessfully tested with `llama-scout-17b`