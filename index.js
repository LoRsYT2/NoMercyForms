const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, REST, Routes } = require('discord.js');
const http = require('http'); 
require('dotenv').config();

/**
 * ender.com Web Server Setup
 * الضروري لإبقاء البوت يعمل 24/7 على استضافة ريندر في الخطة المجانية
 */
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write("NoMercy Network Bot is running smoothly!");
    res.end();
});

// ريندر يعطي منفذ (Port) تلقائي، نستخدمه لفتح السيرفر
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`[SYSTEM] Keep-alive server listening on port ${PORT}`);
});

/**
 * Discord Bot Configuration
 */
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

// تعريف الأوامر (Slash Commands)
const commands = [
    new SlashCommandBuilder()
        .setName('staffmcapply')
        .setDescription('Manage Minecraft staff applications.')
        .addSubcommand(sub => sub.setName('accept').setDescription('Accept a Minecraft staff applicant.').addUserOption(opt => opt.setName('member').setDescription('The member to accept').setRequired(true)))
        .addSubcommand(sub => sub.setName('reject').setDescription('Reject a Minecraft staff applicant.').addUserOption(opt => opt.setName('member').setDescription('The member to reject').setRequired(true))),
    new SlashCommandBuilder()
        .setName('staffdcapply')
        .setDescription('Manage Discord staff applications.')
        .addSubcommand(sub => sub.setName('accept').setDescription('Accept a Discord staff applicant.').addUserOption(opt => opt.setName('member').setDescription('The member to accept').setRequired(true)))
        .addSubcommand(sub => sub.setName('reject').setDescription('Reject a Discord staff applicant.').addUserOption(opt => opt.setName('member').setDescription('The member to reject').setRequired(true)))
].map(command => command.toJSON());

/**
 * Bot Events
 */
// استخدام 'ready' بشكل صحيح لنسخة discord.js v14
client.once('ready', async (c) => {
    console.log(`[READY] Connected as ${c.user.tag}`);
    
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        console.log('[SYSTEM] refreshing application (/) commands...');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID || c.user.id), 
            { body: commands }
        );
        console.log('[SUCCESS] Commands synced with Discord.');
    } catch (error) {
        console.error('[ERROR] Failed to sync commands:', error);
    }
});

/**
 * Interaction Handling
 */
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, user: staffMember } = interaction;
    const subcommand = options.getSubcommand();
    const targetUser = options.getUser('member');
    
    const formName = commandName === 'staffmcapply' ? 'Staff Application' : 'Staff Discord Application';
    const isAccept = subcommand === 'accept';

    let embedDescription = '';

    if (isAccept) {
        embedDescription = 
            `> **Form:** \`${formName}\`\n` +
            `> **Status:** \`${isAccept ? 'Accepted' : 'Denied'}\`\n` +
            `> **Reason:** \`Hello ${targetUser.username},\n` +
            `>\n` +
            `> Congratulations! 🎉 After carefully reviewing your application, we are pleased to inform you that you have been accepted to join the NoMercy Network Staff Team.\n` +
            `>\n` +
            `> Your strong answers, previous staff experience, maturity, and commitment to fairness and responsibility stood out. We believe you will be a great addition to our team.\n` +
            `>\n` +
            `> 👉 Please check your Discord messages for further instructions on the next steps (training, permissions, and staff channels).\n` +
            `>\n` +
            `> Welcome aboard — we're excited to have you on the team!\n` +
            `>\n` +
            `> -NoMercy Network Management\``;
    } else {
        embedDescription = 
            `> **Form:** \`${formName}\`\n` +
            `> **Status:** \`${isAccept ? 'Accepted' : 'Denied'}\`\n` +
            `> **Reason:** \`After reviewing your application we decided to not proceed with it.\n` +
            `>\n` +
            `> Reason: Lack of experience.\n` +
            `>\n` +
            `> -NoMercy Network Management\``;
    }

    const embed = new EmbedBuilder()
        .setTitle(isAccept ? '✅ Submission Accepted' : '❌ Submission Denied')
        .setDescription(`### 📝 Status Update\n${embedDescription}`)
        .setColor(isAccept ? 0x2ECC71 : 0xE74C3C)
        .setTimestamp();

    try {
        await targetUser.send({ embeds: [embed] });
        await interaction.reply({ content: `✅ DM sent to ${targetUser.tag}.`, ephemeral: true });
    } catch (error) {
        await interaction.reply({ content: `❌ Could not send DM to ${targetUser.tag}. (Locked DMs)`, ephemeral: true });
    }
});


client.login(process.env.TOKEN);
