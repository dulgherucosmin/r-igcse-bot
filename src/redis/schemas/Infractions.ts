import type { RedisClientType } from "redis";

const SEARCH_TERM_SEPARATOR = /\s+/;

export type IInfraction = {
	rule: string;
	reason: string;
};

export class InfractionsRepository {
	constructor(private readonly client: RedisClientType) {}

	// returns every stored rule and reason
	async getAll(): Promise<IInfraction[]> {
		const infractions: IInfraction[] = [];

		for await (const key of this.client.scanIterator({
			MATCH: "Infraction:*",
			TYPE: "hash",
		})) {
			const infraction = await this.client.hGetAll(key);
			if (infraction.rule && infraction.reason) {
				infractions.push({
					rule: infraction.rule,
					reason: infraction.reason,
				});
			}
		}

		return infractions;
	}

	// returns matching reasons for autocomplete
	async autoComplete(phrase: string): Promise<string[]> {
		const normalizedPhrase = phrase.trim().toLowerCase();
		const searchTerms = normalizedPhrase
			.split(SEARCH_TERM_SEPARATOR)
			.filter(Boolean);
		const infractions = await this.getAll();

		return infractions
			.map(({ rule, reason }) => `${rule}: ${reason}`)
			.filter((infraction) => {
				const normalizedInfraction = infraction.toLowerCase();
				return searchTerms.every((term) =>
					normalizedInfraction.includes(term),
				);
			})
			.toSorted((first, second) => {
				const firstContainsPhrase = first
					.toLowerCase()
					.includes(normalizedPhrase);
				const secondContainsPhrase = second
					.toLowerCase()
					.includes(normalizedPhrase);

				if (firstContainsPhrase !== secondContainsPhrase) {
					return firstContainsPhrase ? -1 : 1;
				}
				return first.localeCompare(second);
			});
	}

	// adds to db
	async set(infraction: IInfraction): Promise<void> {
		const key = `Infraction:${infraction.rule}:${infraction.reason}`;
		await this.client.hSet(key, infraction);
	}

	// removes from db
	async delete(infraction: IInfraction): Promise<void> {
		const key = `Infraction:${infraction.rule}:${infraction.reason}`;
		await this.client.del(key);
	}
}
