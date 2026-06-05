const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, REST, Routes } = require('discord.js');
const http = require('http');
require('dotenv').config();

// Define allowed staff roles
const ALLOWED_ROLE_IDS = ['1509183395907899475', '1509736904545800315'];

// Keep-alive server for Render
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write("Bot is online.");
    res.end();
});

server.listen(process.env.PORT || 8080);

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// Command builder helper
const createCommand = (name, description) => 
    new SlashCommandBuilder()
        .setName(name)
        .setDescription(description)
        .addSubcommand(sub => sub
            .setName('accept')
            .setDescription('Accept an applicant')
            .addUserOption(o => o.setName('member').setDescription('The member to accept').setRequired(true))
            .addStringOption(o => o.setName('reason').setDescription('Optional note for the member')))
        .addSubcommand(sub => sub
            .setName('reject')
            .setDescription('Reject an applicant')
            .addUserOption(o => o.setName('member').setDescription('The member to reject').setRequired(true))
            .addStringOption(o => o.setName('reason').setDescription('The reason for rejection').setRequired(true)));

const commands = [
    createCommand('staffmcapply', 'Manage Minecraft staff applications'),
    createCommand('staffdcapply', 'Manage Discord staff applications')
].map(cmd => cmd.toJSON());

client.once('ready', async (c) => {
    console.log(`Logged in as ${c.user.tag}`);
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
    console.log('Slash commands synced.');
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // Check permissions
    if (!interaction.member.roles.cache.some(r => ALLOWED_ROLE_IDS.includes(r.id))) {
        return interaction.reply({ content: 'You do not have permission to use this command.', flags: 64 });
    }

    const sub = interaction.options.getSubcommand();
    const target = interaction.options.getUser('member');
    const reason = interaction.options.getString('reason') || 'No additional notes provided.';
    const form = interaction.commandName === 'staffmcapply' ? 'Staff Application' : 'Staff Discord Application';
    const isAccept = sub === 'accept';

    // Build the embed content
    const embed = new EmbedBuilder()
        .setTitle(isAccept ? '✅ Submission Accepted' : '❌ Submission Denied')
        .setColor(isAccept ? 0x2ECC71 : 0xE74C3C)
        .setTimestamp()
        .setDescription(
            `### 📝 Status Update\n` +
            `> **Form:** \`${form}\`\n` +
            `> **Status:** \`${isAccept ? 'Accepted' : 'Denied'}\`\n` +
            `> **Reason:** \`${reason}\`\n\n` +
            (isAccept 
                ? `> Congratulations! You have been accepted to join the team. Please check your DMs for further instructions.` 
                : `> We regret to inform you that we have decided not to proceed with your application at this time.`)
        );

    // Send the DM
    try {
        await target.send({ embeds: [embed] });
        await interaction.reply({ content: `Successfully sent status update to ${target.tag}.`, flags: 64 });
    } catch (err) {
        await interaction.reply({ content: `Failed to send DM to ${target.tag}. They might have their DMs closed.`, flags: 64 });
    }
});

client.login(process.env.TOKEN);
