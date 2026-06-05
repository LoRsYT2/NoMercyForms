const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, REST, Routes } = require('discord.js');
const http = require('http'); 
require('dotenv').config();

const ALLOWED_ROLE_IDS = ['1509183395907899475', '1509736904545800315']; 

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write("NoMercy Network Bot is running!");
    res.end();
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`[SYSTEM] Keep-alive server listening on port ${PORT}`));

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// تعريف الأوامر مع إضافة خيار السبب (reason)
const createCommand = (name, description) => 
    new SlashCommandBuilder()
        .setName(name)
        .setDescription(description)
        .addSubcommand(sub => sub.setName('accept').setDescription('Accept').addUserOption(o => o.setName('member').setDescription('Member').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Optional accept reason')))
        .addSubcommand(sub => sub.setName('reject').setDescription('Reject').addUserOption(o => o.setName('member').setDescription('Member').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Required rejection reason').setRequired(true)));

const commands = [
    createCommand('staffmcapply', 'Manage Minecraft staff applications.'),
    createCommand('staffdcapply', 'Manage Discord staff applications.')
].map(command => command.toJSON());

client.once('ready', async (c) => {
    console.log(`[READY] Connected as ${c.user.tag}`);
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID || c.user.id), { body: commands });
    console.log('[SUCCESS] Commands synced.');
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (!interaction.member.roles.cache.some(r => ALLOWED_ROLE_IDS.includes(r.id))) {
        return interaction.reply({ content: '❌ ليس لديك صلاحية.', flags: 64 });
    }

    const subcommand = interaction.options.getSubcommand();
    const targetUser = interaction.options.getUser('member');
    const reason = interaction.options.getString('reason') || (subcommand === 'accept' ? 'No additional notes.' : 'No reason provided.');
    const formName = interaction.commandName === 'staffmcapply' ? 'Staff Application' : 'Staff Discord Application';
    const isAccept = subcommand === 'accept';

    const embedDescription = 
        `> **Form:** \`${formName}\`\n` +
        `> **Status:** \`${isAccept ? 'Accepted' : 'Denied'}\`\n` +
        `> **Reason:** \`${reason}\`\n\n` +
        (isAccept ? `> Congratulations! 🎉 Welcome to the team!` : `> We regret to inform you that we cannot proceed.`);

    const embed = new EmbedBuilder()
        .setTitle(isAccept ? '✅ Submission Accepted' : '❌ Submission Denied')
        .setDescription(`### 📝 Status Update\n${embedDescription}`)
        .setColor(isAccept ? 0x2ECC71 : 0xE74C3C)
        .setTimestamp();

    try {
        await targetUser.send({ embeds: [embed] });
        await interaction.reply({ content: `✅ تم إرسال الرد لـ ${targetUser.tag}.`, flags: 64 });
    } catch (e) {
        await interaction.reply({ content: `❌ تعذر إرسال DM لـ ${targetUser.tag}.`, flags: 64 });
    }
});

client.login(process.env.TOKEN);
