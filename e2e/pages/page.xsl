<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" doctype-system="about:legacy-compat"/>
  <xsl:template match="/">
    <html lang="en" data-variant="a">
      <head>
        <meta charset="UTF-8"/>
        <title><xsl:value-of select="doc/title"/></title>
        <link rel="stylesheet" href="/page.css"/>
        <script><![CDATA[window.order = ['inline-1']; document.addEventListener('DOMContentLoaded', () => { window.loaded = true; });]]></script>
        <script src="/external.js"></script>
        <script><![CDATA[window.order.push(window.EXTERNAL ? 'inline-2 after external' : 'inline-2 too early');]]></script>
      </head>
      <body>
        <h1 id="title"><xsl:value-of select="doc/title"/></h1>
        <svg id="icon" width="20" height="20" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>
        <table id="rows"><xsl:for-each select="doc/item"><tr><td><xsl:value-of select="."/></td></tr></xsl:for-each></table>
        <div id="content"><xsl:value-of select="doc/content" disable-output-escaping="yes"/></div>
        <div id="dynamic"/>
        <script><![CDATA[
          const d = document.getElementById('dynamic');
          const strong = document.createElement('strong');
          strong.id = 'strong';
          strong.textContent = 'dynamic';
          d.append(strong);
          document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: '/dynamic.css' }));
          const box = document.createElement('div');
          box.id = 'inner';
          box.innerHTML = '<p>one<br>two<p>three';
          box.insertAdjacentHTML('beforeend', '<p id="adjacent">four<br>five');
          d.append(box);
        ]]></script>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
