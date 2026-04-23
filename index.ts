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
const bucketFixedName = config.get("bucketName") || "tp-static-files";

const awsLocalProvider = new aws.Provider("aws-local-provider", {
    region: "us-east-1",
    accessKey: "test",
    secretKey: "test",
    s3UsePathStyle: true,
    skipCredentialsValidation: true,
    skipMetadataApiCheck: true,
    skipRegionValidation: true,
    skipRequestingAccountId: true,
    endpoints: [{ s3: "http://localhost:4566" }],
});

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


const bucket = new aws.s3.Bucket("static-bucket", {
    bucket: bucketFixedName,
}, {
    provider: awsLocalProvider,
});

const file = new aws.s3.BucketObject("index-html", {
    bucket: bucket.id,
    key: "index.html",
    content: "<h1>Hello from LocalStack S3 🚀</h1>",
    contentType: "text/html",
}, {
    provider: awsLocalProvider,
});

// ============================================
// 6. OUTPUTS (équiv. outputs.tf)
// ============================================
export const dbContainerName = dbContainer.name;
export const appAccessUrl = pulumi.interpolate`http://localhost:${appPortExternal}`;
export const networkName = network.name;
export const bucketName = bucketFixedName;
export const fileUrl = pulumi.interpolate`http://localhost:4566/${bucketFixedName}/index.html`;