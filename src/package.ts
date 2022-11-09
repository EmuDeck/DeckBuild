import {JSONObject, required} from 'ts-json-object';

export class Package extends JSONObject
{
	@required
	name!: string;

	@required
	version!: string;
}
