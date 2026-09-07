import type { DiscordClient } from "@/registry/DiscordClient";
import {
  ApplicationIntegrationType,
  InteractionContextType,
  SlashCommandBuilder,
} from "discord.js";
import BaseCommand, {
  type DiscordChatInputCommandInteraction,
} from "../../registry/Structure/BaseCommand";
import { isBotDev } from "@/utils/isBotDev";
import { Logger } from "@discordforge/logger";
import { syncCommands } from "@/registry";

export default class SyncCommandsCommand extends BaseCommand {
  constructor() {
    super(
      new SlashCommandBuilder()
        .setName("sync_commands")
        .setDescription("Syncs commands, for Bot Developers only.")
        .setContexts(InteractionContextType.Guild)
        .setIntegrationTypes(ApplicationIntegrationType.GuildInstall),
    );
  }

  async execute(
    client: DiscordClient<true>,
    interaction: DiscordChatInputCommandInteraction,
  ) {
    await interaction.deferReply();
    if (!(await isBotDev(client, interaction.user.id))) {
      interaction.editReply({
        content: "You are not authorized to use this command.",
      });
      return;
    }

    await syncCommands(client)
      .then(() => {
        Logger.info(
          `Synced application commands globally (by ${interaction.user.displayName})`,
        );
        interaction.editReply({ content: "Succesfully synced commands." });
      })
      .catch((e: Error) => {
        Logger.error(
          `Error syncing application commands globally (by ${interaction.user.displayName}): ${e}`,
        );
        interaction.editReply({ content: "Error syncing commands." });
      });
  }
}
