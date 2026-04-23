import * as pulumi from "@pulumi/pulumi";
import * as docker from "@pulumi/docker";
import * as aws from "@pulumi/aws";

// ============================================
// 1. VARIABLES CONFIGURABLES (équiv. variables.tf)
// ============================================
const config = new pulumi.Config();
const dbName = config.get("dbName") || "devops_db";
const dbUser = config.get("dbUser") || "devops_user";
const dbPassword = config.getSecret("dbPassword") || pulumi.secret("strongpassword123");
const appPortExternal = config.getNumber("appPortExternal") || 8080;

// ============================================
// 2. RESEAU DOCKER
// ============================================
const network = new docker.Network("tp-network", {
    name: "tp-iac-network",
});

// ============================================
// 3. BASE DE DONNEES — Conteneur PostgreSQL
// ============================================
const dbContainer = new docker.Container("db-container", {
    name: "tp-db-postgres",
    image: "postgres:latest",
    networksAdvanced: [{
        name: network.name,
    }],
    ports: [{
        internal: 5432,
        external: 5432,
    }],
    envs: [
        pulumi.interpolate`POSTGRES_USER=${dbUser}`,
        pulumi.interpolate`POSTGRES_PASSWORD=${dbPassword}`,
        pulumi.interpolate`POSTGRES_DB=${dbName}`,
    ],
    restart: "always",
});

// ============================================
// 4. APPLICATION WEB — Conteneur Nginx
// ============================================
const appImage = new docker.Image("app-image", {
    imageName: "tp-web-app:latest",
    build: {
        context: ".",
        dockerfile: "Dockerfile_app",
    },
    skipPush: true,
});

const appContainer = new docker.Container("app-container", {
    name: "tp-app-web",
    image: appImage.imageName,
    networksAdvanced: [{
        name: network.name,
    }],
    ports: [{
        internal: 80,
        external: appPortExternal,
    }],
    restart: "always",
}, {
    dependsOn: [dbContainer],
});

// ============================================
// 5. BUCKET S3 (LocalStack)
// ============================================
const staticBucket = new aws.s3.Bucket("static-bucket", {
    bucket: "tp-static-files",
    website: {
        indexDocument: "index.html",
    },
    tags: {
        Environment: "dev",
        Project: "tp-pulumi-iac",
    },
});

// Rend le bucket publiquement accessible
const bucketPublicAccess = new aws.s3.BucketPublicAccessBlock("bucket-public-access", {
    bucket: staticBucket.id,
    blockPublicAcls: false,
    blockPublicPolicy: false,
    ignorePublicAcls: false,
    restrictPublicBuckets: false,
});

// Upload d'un fichier HTML statique dans le bucket
const indexFile = new aws.s3.BucketObject("index-html", {
    bucket: staticBucket.id,
    key: "index.html",
    content: "<h1>Static file hosted via Pulumi IaC on LocalStack S3!</h1>",
    contentType: "text/html",
}, {
    dependsOn: [bucketPublicAccess],
});

// ============================================
// 6. OUTPUTS (équiv. outputs.tf)
// ============================================
export const dbContainerName = dbContainer.name;
export const appAccessUrl = pulumi.interpolate`http://localhost:${appPortExternal}`;
export const networkName = network.name;
export const bucketName = staticBucket.id;
export const bucketEndpoint = pulumi.interpolate`http://localhost:4566/${staticBucket.id}/index.html`;