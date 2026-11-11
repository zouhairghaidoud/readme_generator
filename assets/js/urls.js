/* Normalisation helpers for social handles and portfolio URLs. */
(function (global) {
  'use strict';

  const RF = (global.RF = global.RF || {});

  const firstToken = (value) => String(value ?? '').trim().replace(/^@+/, '').split(/[\s/?#]+/)[0] || '';

  function github(raw) {
    const value = String(raw ?? '').trim();
    if (!value) return '';
    const urlMatch = value.match(/github\.com\/([^/?#\s]+)/i);
    const handle = urlMatch ? urlMatch[1] : firstToken(value);
    return handle.replace(/[^A-Za-z0-9-]/g, '').slice(0, 39);
  }

  function linkedin(raw) {
    const value = String(raw ?? '').trim();
    if (!value) return '';
    const urlMatch = value.match(/linkedin\.com\/(?:in|company)\/([^/?#\s]+)/i);
    const handle = urlMatch ? urlMatch[1] : firstToken(value.replace(/^https?:\/\/(www\.)?linkedin\.com\/(?:in\/)?/i, ''));
    return handle.replace(/[^A-Za-z0-9\-_.]/g, '');
  }

  function twitter(raw) {
    const value = String(raw ?? '').trim();
    if (!value) return '';
    const urlMatch = value.match(/(?:twitter|x)\.com\/([^/?#\s]+)/i);
    const handle = urlMatch ? urlMatch[1] : firstToken(value);
    if (/^(intent|share|home|i)$/i.test(handle)) return '';
    return handle.replace(/[^A-Za-z0-9_]/g, '').slice(0, 30);
  }

  function devto(raw) {
    const value = String(raw ?? '').trim();
    if (!value) return '';
    const urlMatch = value.match(/dev\.to\/([^/?#\s]+)/i);
    const handle = urlMatch ? urlMatch[1] : firstToken(value);
    return handle.replace(/[^A-Za-z0-9_\-]/g, '');
  }

  function medium(raw) {
    const value = String(raw ?? '').trim();
    if (!value) return '';
    const urlMatch = value.match(/medium\.com\/@?([^/?#\s]+)/i);
    const handle = urlMatch ? urlMatch[1] : firstToken(value);
    return handle.replace(/[^A-Za-z0-9_\-.]/g, '');
  }

  function hashnode(raw) {
    const value = String(raw ?? '').trim();
    if (!value) return '';
    const urlMatch = value.match(/hashnode\.com\/@?([^/?#\s]+)/i);
    const handle = urlMatch ? urlMatch[1] : firstToken(value);
    return handle.replace(/[^A-Za-z0-9_\-.]/g, '');
  }

  function email(raw) {
    const value = String(raw ?? '').trim().replace(/^mailto:/i, '');
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : '';
  }

  function portfolio(raw) {
    const value = String(raw ?? '').trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value.replace(/\s+/g, '');
    return `https://${value.replace(/^\/+/, '').replace(/\s+/g, '')}`;
  }

  function domain(url) {
    if (!url) return '';
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url.replace(/^https?:\/\//i, '').replace(/^www\./, '').replace(/\/$/, '');
    }
  }

  function socialLinks(social) {
    if (!social) return [];
    const links = [];
    const gh = github(social.github);
    const li = linkedin(social.linkedin);
    const x = twitter(social.twitter);
    const dt = devto(social.devto);
    const md = medium(social.medium);
    const hn = hashnode(social.hashnode);
    const em = email(social.email);
    const web = portfolio(social.portfolio);

    if (gh) {
      links.push({
        key: 'github',
        label: 'GitHub',
        alt: 'GitHub',
        color: '181717',
        logo: 'github',
        url: `https://github.com/${gh}`,
      });
    }
    if (li) {
      links.push({
        key: 'linkedin',
        label: 'LinkedIn',
        alt: 'LinkedIn',
        color: '0A66C2',
        logo: 'linkedin',
        url: `https://www.linkedin.com/in/${li}`,
      });
    }
    if (x) {
      links.push({
        key: 'twitter',
        label: 'Twitter',
        alt: 'Twitter / X',
        color: '000000',
        logo: 'x',
        url: `https://x.com/${x}`,
      });
    }
    if (dt) {
      links.push({
        key: 'devto',
        label: 'Dev.to',
        alt: 'Dev.to',
        color: '0A0A0A',
        logo: 'devdotto',
        url: `https://dev.to/${dt}`,
      });
    }
    if (md) {
      links.push({
        key: 'medium',
        label: 'Medium',
        alt: 'Medium',
        color: '12100E',
        logo: 'medium',
        url: `https://medium.com/@${md}`,
      });
    }
    if (hn) {
      links.push({
        key: 'hashnode',
        label: 'Hashnode',
        alt: 'Hashnode',
        color: '2962FF',
        logo: 'hashnode',
        url: `https://hashnode.com/@${hn}`,
      });
    }
    if (em) {
      links.push({
        key: 'email',
        label: 'Email',
        alt: 'Email',
        color: 'D14836',
        logo: 'gmail',
        url: `mailto:${em}`,
      });
    }
    if (web) {
      links.push({
        key: 'portfolio',
        label: 'Portfolio',
        alt: `Portfolio – ${domain(web)}`,
        color: '4F46E5',
        logo: 'googlechrome',
        url: web,
      });
    }
    return links;
  }

  RF.urls = {
    github,
    linkedin,
    twitter,
    devto,
    medium,
    hashnode,
    email,
    portfolio,
    domain,
    socialLinks,
  };
})(window);
