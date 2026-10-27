# Kubernetes manifests

These are an example of running the app on a Kubernetes cluster. You don't need them to
run or review the app: `docker compose up --build` is the one-command way to run it
locally, and the live site is hosted without Kubernetes (see the
[README](../README.md)).

They show the deployment's shape:

- a **frontend** (2 replicas): stateless, so it can scale freely;
- a **backend** (1 replica): live games are kept in its memory, so a second replica wouldn't
  see the first one's games (see [docs/DECISIONS.md](../docs/DECISIONS.md));
- **Postgres** with a persistent volume, and an init container that makes the backend wait
  until the database is ready.

These manifests were tested on a local `kind` cluster.

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

`frontend`'s Service is `type: LoadBalancer`. How to reach it depends on the cluster:

- **Docker Desktop and most cloud providers**: it gets an address directly.
- **minikube**: run `minikube tunnel` in another terminal first.
- **kind**: run `kubectl port-forward service/frontend 3000:80`, then open
  http://localhost:3000 (or install MetalLB).

To remove everything afterwards: `kubectl delete -k k8s/`.

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
- **No HTTPS.** The app is served over plain HTTP, which is why the login cookie isn't
  marked Secure here (`SECURE_COOKIE` defaults to `false`). A real cluster would put TLS in
  front and set `SECURE_COOKIE=true`.
