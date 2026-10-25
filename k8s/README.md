# Kubernetes manifests

These aren't meant to replace `docker compose up --build` for local development - that's
still the one-command way to run the app. They're here to show the deployment shape: a
stateless, horizontally-scalable frontend; a backend that (today) can only run as a single
replica because its game state lives in memory (see docs/DECISIONS.md); and a Postgres
instance with a persistent volume.

There's no image registry involved - these reference `chess960-backend:latest` and
`chess960-frontend:latest` directly and expect them to already exist on the cluster's
nodes, with `imagePullPolicy: IfNotPresent`. For a real deployment you'd build, push to a
registry, and point the manifests at `your-registry/chess960-backend:v1` etc. instead.

## Try it locally

Build the same images docker-compose builds:

```bash
docker build -t chess960-backend:latest ./backend
docker build -t chess960-frontend:latest ./frontend
```

Then load them into whichever local cluster you're using - Kubernetes won't see images
that only exist in your regular Docker image store:

```bash
# Docker Desktop's built-in Kubernetes: no load step, it shares Docker's image store.

# kind:
kind load docker-image chess960-backend:latest chess960-frontend:latest

# minikube:
minikube image load chess960-backend:latest
minikube image load chess960-frontend:latest
```

Apply everything:

```bash
kubectl apply -k k8s/
```

Wait for it to come up, then find the frontend:

```bash
kubectl get pods --watch
kubectl get service frontend
```

`frontend`'s Service is `type: LoadBalancer`. Docker Desktop and most cloud providers give
it a reachable address directly; on minikube, run `minikube tunnel` in another terminal
first; on kind, either install MetalLB or `kubectl port-forward service/frontend 3000:80`
instead.

## What's deliberately left out

- **No ingress controller / Ingress resource.** One `LoadBalancer` Service is enough for a
  single app; an Ingress earns its complexity once there's more than one service to route
  between.
- **No HorizontalPodAutoscaler.** The frontend could have one; the backend can't be
  autoscaled at all until its state is shared across replicas.
- **No NetworkPolicy, PodDisruptionBudget, or resource quotas.** Reasonable for a real
  cluster, not load-bearing for showing the deployment shape.
- **Secrets are committed in plaintext-base64** (`postgres-secret.yaml`), matching the demo
  credentials docker-compose.yml already uses. Fine for a take-home; not how you'd handle
  real secrets (sealed-secrets, an external secret manager, etc.).
