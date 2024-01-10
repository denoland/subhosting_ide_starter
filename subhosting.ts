// Lifted from https://deno.land/x/url_join

// deno-lint-ignore no-explicit-any
function urlJoin(...args: any[]) {
  let input;

  if (typeof args[0] === "object") {
    input = args[0];
  } else {
    input = [].slice.call(args);
  }

  return normalize(input);
}

function normalize(strArray: Array<string>) {
  const resultArray = [];
  if (strArray.length === 0) {
    return "";
  }

  if (typeof strArray[0] !== "string") {
    throw new TypeError("Url must be a string. Received " + strArray[0]);
  }

  if (strArray[0].match(/^[^/:]+:\/*$/) && strArray.length > 1) {
    const first = strArray.shift();
    strArray[0] = first + strArray[0];
  }

  if (strArray[0].match(/^file:\/\/\//)) {
    strArray[0] = strArray[0].replace(/^([^/:]+):\/*/, "$1:///");
  } else {
    strArray[0] = strArray[0].replace(/^([^/:]+):\/*/, "$1://");
  }

  for (let i = 0; i < strArray.length; i++) {
    let component = strArray[i];

    if (typeof component !== "string") {
      throw new TypeError("Url must be a string. Received " + component);
    }

    if (component === "") {
      continue;
    }

    if (i > 0) {
      component = component.replace(/^[\/]+/, "");
    }
    if (i < strArray.length - 1) {
      component = component.replace(/[\/]+$/, "");
    } else {
      component = component.replace(/[\/]+$/, "/");
    }

    resultArray.push(component);
  }

  let str = resultArray.join("/");
  // Each input component is now separated by a single slash except the possible first plain protocol part.

  // remove trailing slash before parameters or hash
  str = str.replace(/\/(\?|&|#[^!])/g, "$1");

  // replace ? in parameters with &
  const parts = str.split("?");
  str = parts.shift() + (parts.length > 0 ? "?" : "") + parts.join("&");

  return str;
}

/**
 * Subhosting API client initialization options.
 */
export default interface ClientOptions {
  /**
   * API endpoint to use for the client. Defaults to:
   * "https://api.deno.com/v1"
   */
  endpoint?: string;
}

/**
 * Client class for accessing the Deno Subhosting API. Provides a fetch-like
 * "request" method for making requests against the API root (configurable
 * through client options), and several helper methods for making common
 * requests for the configured subhosting org.
 *
 * If no arguments are supplied, will attempt to initialize from the following
 * environment variables:
 * - DEPLOY_ACCESS_TOKEN - a valid Deno Deploy access token
 * - DEPLOY_ORG_ID - a string identifier for your Subhosting org
 *
 * Subhosting docs: https://docs.deno.com/deploy/manual/subhosting/
 */
export default class Client {
  /** A valid Deno Deploy access token */
  accessToken: string;

  /** Unique ID for your subhosting org - used in many resource URLs */
  orgId: string;

  /** optional configuration for the client */
  clientOptions: ClientOptions;

  /**
   * Create a new Deno Deploy Subhosting API client.
   *
   * @param accessToken - A valid Deploy access token
   * @param orgId - A Subhosting organization ID
   * @param options - initialization options for the client
   */
  constructor(accessToken?: string, orgId?: string, options?: ClientOptions) {
    const at = accessToken ?? Deno.env.get("DEPLOY_ACCESS_TOKEN");
    if (!at) {
      throw new Error(
        "A Deno Deploy access token is required (or set DEPLOY_ACCESS_TOKEN env variable).",
      );
    }

    const org = orgId ?? Deno.env.get("DEPLOY_ORG_ID");
    if (!org) {
      throw new Error(
        "Deno Subhosting org ID is required (or set DEPLOY_ORG_ID env variable).",
      );
    }

    this.accessToken = at;
    this.orgId = org;
    this.clientOptions = Object.assign({
      endpoint: "https://api.deno.com/v1",
    }, options);
  }

  /** Convenience getter for org URL fragment */
  get orgUrl() {
    return `/organizations/${this.orgId}`;
  }

  /**
   * A wrapper around "fetch", preconfigured with your subhosting API info.
   * Docs: https://docs.deno.com/deploy/api/rest/
   *
   * @param url resource to request from the API, e.g. /organizations/foo
   * @param options fetch init options
   * @returns promise for a fetch Response object
   */
  async fetch(url: string, options?: RequestInit): Promise<Response> {
    const finalUrl = urlJoin(this.clientOptions.endpoint, url);
    const finalHeaders = Object.assign({
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
    }, options?.headers || {});
    const finalOptions = Object.assign({}, options, { headers: finalHeaders });

    return await fetch(finalUrl, finalOptions);
  }

  /**
   * Helper to fetch a fully qualified URL - useful for fetching a page of
   * results from the API with a full URL. Docs:
   * https://docs.deno.com/deploy/api/rest/
   *
   * @param url A fully qualified URL to fetch - useful for pagination
   * @param options RequestInit options for fetch
   * @returns promise for a fetch Response object
   */
  async fetchUrl(url: string, options?: RequestInit): Promise<Response> {
    return await this.fetch(url, options);
  }

  /**
   * Get a list of projects for the configured org, with optional query params:
   * https://docs.deno.com/deploy/api/rest/organizations#list-projects-for-an-organization
   *
   * @param query optional object with query string parameters
   * @returns promise for a fetch Response object
   */
  // deno-lint-ignore no-explicit-any
  async listProjects(query?: any): Promise<Response> {
    const qs = new URLSearchParams(query).toString();
    return await this.fetch(`${this.orgUrl}/projects?${qs}`, { method: "GET" });
  }

  /**
   * Create a project within the configured organization for the client. Docs:
   * https://docs.deno.com/deploy/api/rest/organizations#create-a-new-project-for-an-organization
   *
   * @param name optional project name - leave blank for a random name
   * @returns promise for a fetch Response object
   */
  async createProject(name?: string): Promise<Response> {
    return await this.fetch(`${this.orgUrl}/projects`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  /**
   * Get a list of deployments for the given project, with optional query params:
   * https://docs.deno.com/deploy/api/rest/projects#get-project-deployments
   *
   * @param projectId unique identifier for a project
   * @param query optional object with query string parameters
   * @returns promise for a fetch Response object
   */
  // deno-lint-ignore no-explicit-any
  async listDeployments(projectId: string, query?: any): Promise<Response> {
    const qs = new URLSearchParams(query).toString();
    return await this.fetch(`/projects/${projectId}/deployments?${qs}`, {
      method: "GET",
    });
  }

  /**
   * Get a list of logs for the given deployment, with optional query params:
   * https://docs.deno.com/deploy/api/rest/deployments#get-deployment-app-logs
   *
   * @param deploymentId unique identifier for a deployment
   * @param query optional object with query string parameters
   * @returns promise for a fetch Response object
   */
  // deno-lint-ignore no-explicit-any
  async listAppLogs(deploymentId: string, query?: any): Promise<Response> {
    const qs = new URLSearchParams(query).toString();
    return await this.fetch(`/deployments/${deploymentId}/app_logs?${qs}`, {
      method: "GET",
    });
  }

  /**
   * Create a new deployment for the given project by ID. Docs:
   * https://docs.deno.com/deploy/api/rest/deployments
   *
   * @param projectId unique ID for the project you want to deploy
   * @param deploymentOptions content of the deployment - see REST API docs
   * @returns promise for a fetch Response object
   */
  async createDeployment(
    projectId: string,
    // deno-lint-ignore no-explicit-any
    deploymentOptions: any,
  ): Promise<Response> {
    return await this.fetch(`/projects/${projectId}/deployments`, {
      method: "POST",
      body: JSON.stringify(deploymentOptions),
    });
  }
}
