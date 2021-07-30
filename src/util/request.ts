// Credit: This is a TypeScript version of the node-superfetch wrapper module https://github.com/dragonfire535/node-superfetch

import FormData from 'form-data';
import type { Agent } from 'http';
import { METHODS } from 'http';
import type { BodyInit, Headers, HeadersInit } from 'node-fetch';
import fetch from 'node-fetch';

interface RequestOptions {
    url: string;
    method: string;
    headers: HeadersInit;
    body: BodyInit | null;
    redirects: number;
    agent: Agent | null;
}

interface RequestResponse {
    status: number;
    statusText: string;
    headers: Headers;
    redirected: boolean;
    url: string;
    ok: boolean;
    buffer: Buffer;
    text: string;
    body: any;
}

type StaticRequest = (url: string, options?: Partial<RequestOptions>) => Request;

class Request implements Promise<RequestResponse> {
    public static acl: StaticRequest;
    public static bind: StaticRequest;
    public static checkout: StaticRequest;
    public static connect: StaticRequest;
    public static copy: StaticRequest;
    public static delete: StaticRequest;
    public static get: StaticRequest;
    public static head: StaticRequest;
    public static link: StaticRequest;
    public static lock: StaticRequest;
    public static merge: StaticRequest;
    public static mkactivity: StaticRequest;
    public static mkcalendar: StaticRequest;
    public static mkcol: StaticRequest;
    public static move: StaticRequest;
    public static notify: StaticRequest;
    public static options: StaticRequest;
    public static patch: StaticRequest;
    public static post: StaticRequest;
    public static propfind: StaticRequest;
    public static proppatch: StaticRequest;
    public static purge: StaticRequest;
    public static put: StaticRequest;
    public static rebind: StaticRequest;
    public static report: StaticRequest;
    public static search: StaticRequest;
    public static source: StaticRequest;
    public static subscribe: StaticRequest;
    public static trace: StaticRequest;
    public static unbind: StaticRequest;
    public static unlink: StaticRequest;
    public static unlock: StaticRequest;
    public static unsubscribe: StaticRequest;

    private readonly url: URL;
    private readonly method: string;
    private readonly headers: HeadersInit;
    private body: BodyInit | FormData | undefined;
    private follow: number;
    private httpAgent: Agent | undefined;

    public constructor(options: RequestOptions) {
        this.url = new URL(options.url);
        this.method = options.method?.toUpperCase() ?? 'GET';
        this.headers = options.headers ?? {};
        this.body = options.body ?? undefined;
        this.follow = options.redirects ?? 20;
        this.httpAgent = options.agent ?? undefined;
    }

    private async request(): Promise<RequestResponse> {
        const response = await fetch(this.url.toString(), {
            method: this.method,
            headers: this.headers,
            follow: this.follow,
            body: this.body,
            agent: this.httpAgent
        });

        const buffer = await response.buffer();

        const res: RequestResponse = {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            redirected: response.redirected,
            url: response.url,
            ok: response.ok,
            buffer,
            get text() {
                return buffer.toString();
            },
            get body() {
                if (/application\/json/gi.test(response.headers.get('content-type'))) {
                    try {
                        return JSON.parse(res.text);
                    } catch {
                        return res.text;
                    }
                } else {
                    return buffer;
                }
            }
        };

        if (!response.ok) {
            const err = new Error(`${res.status} ${res.statusText}`);
            Object.assign(err, res);
            throw err;
        }

        return res;
    }

    public query(params: Record<string, any>): this;
    public query(params: string, value: any): this;
    public query(params: Record<string, any> | string, value?: any): this {
        if (typeof params === 'object') {
            for (const [param, val] of Object.entries(params)) this.url.searchParams.append(param, val);
        } else if (typeof params === 'string' && value) {
            this.url.searchParams.append(params, value);
        } else {
            throw new TypeError('The "query" parameter must be either an object or a query field.');
        }

        return this;
    }

    public set(headers: Record<string, unknown>): this;
    public set(headers: string, value: unknown): this;
    public set(headers: Record<string, unknown> | string, value?: unknown): this {
        if (typeof headers === 'object') {
            for (const [header, val] of Object.entries(headers)) (this.headers as Record<string, unknown>)[header.toLowerCase()] = val;
        } else if (typeof headers === 'string' && value) {
            (this.headers as Record<string, unknown>)[headers.toLowerCase()] = value;
        } else {
            throw new TypeError('The "headers" parameter must be either an object or a header field.');
        }

        return this;
    }

    public attach(...args: [string, any]): this;
    public attach(...args: [Record<string, any>]): this;
    public attach(...args: [Record<string, any> | string, any?]): this {
        if (!this.body || !(this.body instanceof FormData)) this.body = new FormData();

        if (typeof args[0] === 'object') {
            for (const [key, val] of Object.entries(args[0])) void this.attach(key, val);
        } else {
            (this.body as FormData).append(...args as [string, any]);
        }

        return this;
    }

    public send(body: BodyInit | Record<string, unknown>): this {
        if (!(body instanceof FormData) && typeof body === 'object') {
            const header = (this.headers as Record<string, unknown>)['content-type'] as string;
            if (header && !/application\/json/gi.test(header)) void this.set('content-type', 'application/json');
            body = JSON.stringify(body);
        }

        this.body = body;

        return this;
    }

    public redirects(amount: number): this {
        if (typeof amount !== 'number') throw new TypeError('The "amount" parameter must be a number.');
        this.follow = amount;

        return this;
    }

    public agent(agent: Agent): this {
        this.httpAgent = agent;
        return this;
    }

    public then(onFullfilled: (res: RequestResponse) => any, onRejected?: (e: any) => any): Promise<any> {
        return this
            .request()
            .then(onFullfilled, onRejected);
    }

    public catch(onRejected: (e: any) => any): Promise<any> {
        return this
            .request()
            .catch(onRejected);
    }

    public finally(onFinally: () => void): Promise<RequestResponse> {
        return this
            .request()
            .finally(onFinally);
    }

    public get [Symbol.toStringTag](): string {
        return this.constructor.name;
    }
}

for (const method of METHODS) {
    if (!/^[A-Z$_]+$/gi.test(method)) continue;

    Object.defineProperty(Request, method.toLowerCase(), {
        enumerable: true,
        value: function request(url: string, options: RequestOptions): Request {
            return new Request({ url, method, ...options });
        }
    });
}

export { Request as request };