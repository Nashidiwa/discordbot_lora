import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BookOpen,
  Gift,
  Layers,
  Radio,
  Shield,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';

export const OverviewPage: React.FC = () => {
  const { guildId: paramGuildId } = useParams<{ guildId: string }>();
  const { selectedGuild, guilds } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();

  const currentGuild =
    (paramGuildId ? guilds.find((g) => g.id === paramGuildId) : null) ||
    selectedGuild;
  const guildId = currentGuild?.id || paramGuildId || '';

  return (
    <div className="space-y-8 select-none w-full">
      {/* Top Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              {t('overview.title')}
            </h1>
            <Badge variant="blurple" size="md">
              {t('overview.badge')}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-discord-muted">
            {t('overview.subtitle')}{' '}
            <strong className="text-white">
              {currentGuild?.name || t('overview.notSelected')}
            </strong>
          </p>
        </div>

        {currentGuild && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-discord-muted">{t('overview.yourPermissions')}</span>
            <Badge variant="green" size="md" dot>
              {currentGuild.roleTier}
            </Badge>
          </div>
        )}
      </div>

      {/* Guild Identity Spotlight Card */}
      {currentGuild ? (
        <Card hover className="p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-discord-blurple/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-5 relative z-10">
            {currentGuild.icon ? (
              <img
                src={`https://cdn.discordapp.com/icons/${currentGuild.id}/${currentGuild.icon}.png?size=128`}
                alt={currentGuild.name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl object-cover ring-2 ring-discord-blurple/50 shadow-2xl shrink-0"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-discord-blurple/20 text-discord-blurple font-black text-2xl flex items-center justify-center shadow-xl shrink-0">
                {currentGuild.name.charAt(0)}
              </div>
            )}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {currentGuild.name}
                </h3>
                <Badge variant="blurple" size="sm">ID: {currentGuild.id}</Badge>
              </div>
              <p className="text-xs text-discord-muted flex items-center gap-3">
                <span>
                  {t('overview.yourPermissions')}{' '}
                  <strong className="text-emerald-400">
                    {currentGuild.roleTier}
                  </strong>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {currentGuild.memberCount} {t('overview.members')}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto relative z-10">
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate(`/dashboard/guilds/${guildId}/permits`)}
              className="flex-1 md:flex-none text-xs font-bold"
            >
              {t('overview.configurePermit')}
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate(`/dashboard/guilds/${guildId}/perks`)}
              className="flex-1 md:flex-none text-xs font-bold"
            >
              {t('overview.managePerks')}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="p-8 text-center glass-panel rounded-3xl text-discord-muted text-sm border border-white/10">
          {t('overview.pleaseSelectServer')}
        </div>
      )}

      {/* 5 Core Feature Modules Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-discord-muted flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-discord-blurple" />
            <span>{t('overview.modulesTitle')}</span>
          </h2>
          <span className="text-xs text-discord-muted">{t('overview.modulesAvailable')}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Module 1: Permit RBAC */}
          <Card hover className="flex flex-col justify-between group">
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-400 flex items-center justify-center border border-purple-500/30 shadow-lg shadow-purple-500/20">
                  <Shield className="w-6 h-6" />
                </div>
                <Badge variant="muted" size="sm">{t('overview.permitBadge')}</Badge>
              </div>
              <CardTitle className="text-purple-300">{t('overview.permitTitle')}</CardTitle>
              <CardDescription>
                {t('overview.permitDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/dashboard/guilds/${guildId}/permits`)}
                className="w-full text-xs font-semibold hover:border-purple-400/80 hover:text-purple-300 transition"
              >
                {t('overview.permitAction')}
              </Button>
            </CardContent>
          </Card>

          {/* Module 2: Perks Management */}
          <Card hover className="flex flex-col justify-between group">
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-lg shadow-amber-500/20">
                  <Gift className="w-6 h-6" />
                </div>
                <Badge variant="muted" size="sm">{t('overview.perksBadge')}</Badge>
              </div>
              <CardTitle className="text-amber-300">{t('overview.perksTitle')}</CardTitle>
              <CardDescription>
                {t('overview.perksDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/dashboard/guilds/${guildId}/perks`)}
                className="w-full text-xs font-semibold hover:border-amber-400/80 hover:text-amber-300 transition"
              >
                {t('overview.perksAction')}
              </Button>
            </CardContent>
          </Card>

          {/* Module 3: Voice Keeper */}
          <Card hover className="flex flex-col justify-between group">
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shadow-lg shadow-cyan-500/20">
                  <Radio className="w-6 h-6" />
                </div>
                <Badge variant="muted" size="sm">{t('overview.voiceBadge')}</Badge>
              </div>
              <CardTitle className="text-cyan-300">{t('overview.voiceTitle')}</CardTitle>
              <CardDescription>
                {t('overview.voiceDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/dashboard/guilds/${guildId}/voice-keeper`)}
                className="w-full text-xs font-semibold hover:border-cyan-400/80 hover:text-cyan-300 transition"
              >
                {t('overview.voiceAction')}
              </Button>
            </CardContent>
          </Card>

          {/* Module 4: Wordchain Game */}
          <Card hover className="flex flex-col justify-between group">
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-lg shadow-emerald-500/20">
                  <BookOpen className="w-6 h-6" />
                </div>
                <Badge variant="muted" size="sm">{t('overview.wordchainBadge')}</Badge>
              </div>
              <CardTitle className="text-emerald-300">{t('overview.wordchainTitle')}</CardTitle>
              <CardDescription>
                {t('overview.wordchainDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/dashboard/guilds/${guildId}/wordchain`)}
                className="w-full text-xs font-semibold hover:border-emerald-400/80 hover:text-emerald-300 transition"
              >
                {t('overview.wordchainAction')}
              </Button>
            </CardContent>
          </Card>

          {/* Module 5: The Swarm Linked Roles */}
          <Card hover className="flex flex-col justify-between group">
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center border border-indigo-500/30 shadow-lg shadow-indigo-500/20">
                  <Layers className="w-6 h-6" />
                </div>
                <Badge variant="muted" size="sm">{t('overview.swarmBadge')}</Badge>
              </div>
              <CardTitle className="text-indigo-300">{t('overview.swarmTitle')}</CardTitle>
              <CardDescription>
                {t('overview.swarmDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/dashboard/guilds/${guildId}/swarm`)}
                className="w-full text-xs font-semibold hover:border-indigo-400/80 hover:text-indigo-300 transition"
              >
                {t('overview.swarmAction')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default OverviewPage;
