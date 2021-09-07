import type { AutoResponsePayload } from '@robotman/types';
import type { Request, Response, NextHandler } from 'polka';

export enum Methods {
	Get = 'get',
	Post = 'post',
	Patch = 'patch',
	Delete = 'delete'
}

type RouteHandler = (req?: Request, res?: Response, next?: NextHandler) => void;

export interface Route {
	auth?: boolean;

	[Methods.Get]?: RouteHandler;
	[Methods.Post]?: RouteHandler;
	[Methods.Patch]?: RouteHandler;
	[Methods.Delete]?: RouteHandler;
}

export interface OAuthBody {
	code: string;
	redirectUri: string;
}

export interface Session {
	id: string;
	expires: number;
	refreshToken: string;
	accessToken: string;
}

export type TransformedAutoResponse = Omit<AutoResponsePayload, 'aliases'> & { aliases: string };
