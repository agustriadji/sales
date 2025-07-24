# Wings Online Sales API

This repository is an [API Service](https://gitlab.com/groups/nri-in/clients/smu/wo/backend/-/wikis/api-service) component that provides endpoints related to the `sales` domain or context.

## Prerequisites

### Ensure `nvm` is installed

Make sure you have [nvm](https://github.com/nvm-sh/nvm) (Node Version Manager) installed on your machine. `nvm` allows you to easily install and switch between different versions of Node.js via the command line.

### Install the Required Node.JS Version

Run the following command to install the Node.js version specified in the `.nvmrc` file:

```
nvm install
```

This will automatically read the version from the .nvmrc file and install it.

### Ensure `yarn` is installed

This project uses **Yarn Classic v1.22.22**. You can find more details on it [here](https://classic.yarnpkg.com/lang/en/). Ensure you have this version installed, and it's generally recommended to install `yarn` globally. You can install it by running:

```
npm i -g yarn
```

### Obtain credentials to install `@wings-corporation/*` package(s)

This repository depends on the JavaScript library (`@wings-corporation`), which is deployed to the GitLab package registry. To authenticate with the registry, you’ll need appropriate credentials. For more information on the available credentials and how to authenticate, please refer to the [GitLab authentication documentation](https://docs.gitlab.com/user/packages/npm_registry/#authenticate-to-the-package-registry).

Once you've obtain the appropriate credentials (usually in a form of token), create a `.npmrc` file in the root directory of this project. Include the following lines in the `.npmrc` file:

```
@wings-corporation:registry=<domain_name>/api/v4/projects/<project_id>/packages/npm/
//<domain_name>/api/v4/projects/<project_id>/packages/npm/:_authToken=<token>
//<domain_name>/api/v4/packages/npm/:_authToken=<token>
```

Replace `<domain_name>` with your domain name. For example, `gitlab.com` and `<project_id>` with the project ID from the project overview page.

## Getting started

### Starting app

To start the app on your machine:

1. Start the App Configuration Service

The application requires a AppConfig agent to be running. Start it by running:
`docker compose up -d`

2. Prepare environment variable by refering to `Application Configuration` on section `Configurations`
3. Install dependency by running

```bash
# install dependency
$ yarn
```

4. To start, run the script:

```bash
# start the app
$ yarn start

# start the app in watch mode
$ yarn start:dev
```

### Build the app

The app build as Docker image. We provide `Dockerfile` and `Bash Script` to build the app. The script aims to builds and pushes a Docker image to a Docker registry.

1.  Prepare environment variable by refering to `Docker build environment` on section `Configurations`
2.  Run the script:

```bash
# Build app as docker image
$ ./ci/bin/build
```

## Configurations

### Application Configuration

| Environment Variables            | Description                                                                                                                                                       | Required           | Default |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------- |
| LOG_LEVEL                        | The log level used by the application. Valid values are `trace`, `debug`, `info`, `warn`, `error`, `fatal`                                                        |                    | `info`  |
| LOG_ASYNC                        | Enable/disables asynchronous logging. If you do not wish to enable async logging, simplt omit this env var.                                                       |                    | N/A     |
| LOG_MIN_BUFFER                   | Sets the application log minimum buffer length before flushing. Only applicable if you enable async logging.                                                      |                    | 4096    |
| PORT                             | Set the port number which the application will listen to                                                                                                          |                    | 3000    |
| PG_DATABASE_WRITE_URL            | Set the PostgreSQL database connection string used for **write** operation (Write Instance). Example: `postgresql://username:password@host:port/db?schema=public` | :white_check_mark: | N/A     |
| PG_DATABASE_READ_URL             | Set the PostgreSQL database connection string used for **read** operation (Reader Instance). Example: `postgresql://username:password@host:port/db?schema=public` | :white_check_mark: | N/A     |
| JWT_SECRET                       | Set the JWT secret. **Value must be in Base64 format**.                                                                                                           | :white_check_mark: | N/A     |
| OPENSEARCH_NODE                  | Sets the endpoint for OpenSearch to be used. Example: `https://search.ap-southeast-1.es.amazonaws.com`                                                            | :white_check_mark: | N/A     |
| OPENSEARCH_CREDENTIAL            | Sets the OpenSearch credentials to use. Example: `username:password`                                                                                              | :white_check_mark: | N/A     |
| OPENSEARCH_SEARCH_LIMIT          | Sets the OpenSearch search default limit                                                                                                                          |                    | 70      |
| WINGS_SURYA_API_URL              | Sets the endpoint URL for WS API.                                                                                                                                 | :white_check_mark: | N/A     |
| SAYAP_MAS_UTAMA_API_URL          | Sets the endpoint URL for SMU API.                                                                                                                                | :white_check_mark: | N/A     |
| EXTERNAL_API_TIMEOUT             | Sets the timeout in milliseconds for external API calls.                                                                                                          |                    | 5000    |
| TIMEOUT_IN_MILLISECONDS          | Sets the timeout in milliseconds for incoming API calls.                                                                                                          |                    | 5000    |
| PG_MAX_POOL_SIZE                 | Sets the maximum pool size (PostgreSQL).                                                                                                                          |                    | 20      |
| PG_MAX_CONNECTION_TIMEOUT_MILLIS | Sets the number of milliseconds to wait before timing out when connecting a new client.                                                                           |                    | 1000    |
| CACHE_PREFIX                     | Sets the prefix to be appended when saving data to cache.                                                                                                         |                    | sales   |

### AWS Service Configurations

| Environment Variables                     | Description                                                                                                                                                                                   | Required           | Default                      |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ---------------------------- |
| EVENTBRIDGE_EVENT_BUS                     | Sets the event bus to be used (AWS EventBridge)                                                                                                                                               | :white_check_mark: | N/A                          |
| EVENTBRIDGE_EVENT_SOURCE                  | Sets the `source` attribute when sending domain events through the event bus (AWS EventBridge)                                                                                                |                    | `com.online.wings.sales.api` |
| EVENTBRIDGE_LARGE_PAYLOAD_SUPPORT_ENABLED | Enables/disable large payload support for sending domain events. When enabled, payload for large events will be stored in AWS S3. Acceptable values are `true` or `false`.                    |                    | `false`                      |
| EVENTBRIDGE_ALWAYS_USE_S3_FOR_PAYLOADS    | Sets the condition whether to always upload event payloads to S3 or to calculate the size first, and only upload when payload is considered "large". Acceptable values are `true` or `false`. |                    | `false`                      |
| EVENT_BUCKET_NAME                         | Sets the S3 bucket name to be used to upload large events payload. Required when `EVENTBRIDGE_LARGE_PAYLOAD_SUPPORT_ENABLED` is set to `true`                                                 |                    |                              |
| EVENTBRIDGE_REGION                        | Sets the AWS region to use be used for EventBridge Client. If not provided, it will default to the value of `AWS_DEFAULT_REGION` environment variables.                                       |                    | N/A                          |
| S3_REGION                                 | Sets the AWS region to use be used for S3 Client. If not provided, it will default to the value of `AWS_DEFAULT_REGION` environment variables.                                                |                    | N/A                          |
| APP_CONFIG_ENDPOINT                       | The endpoint URL for the application configuration service.                                                                                                                                   |                    | http://localhost:2772        |
| APP_CONFIG_ENVIRONMENT_NAME               | The environment name to pull configurations for.                                                                                                                                              | :white_check_mark: | N/A                          |
| APP_CONFIG_APPLICATION_NAME               | The application name registered in the configuration service.                                                                                                                                 | :white_check_mark: | N/A                          |
| APP_CONFIG_PROFILE_NAME                   | The configuration profile name to be loaded.                                                                                                                                                  | :white_check_mark: | N/A                          |

Since we are using AWS X-Ray, there are configuration options specific to AWS X-Ray that can be set through environment variables. For a full list of these options, please refer to the [AWS X-Ray SDK Node.js configuration documentation](https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs-configuration.html#xray-sdk-nodejs-configuration-envvars).

### Docker build environment

| Key                 | Description                            |      Required      |
| ------------------- | -------------------------------------- | :----------------: |
| **DOCKER_REGISTRY** | Docker registry url to push the image. | :white_check_mark: |
| **IMAGE_NAME**      | Docker image name.                     | :white_check_mark: |
| **DOCKERFILE_PATH** | Path location for `Dockerfile`.        |                    |
