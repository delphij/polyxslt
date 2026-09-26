<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:n="urn:n" version="1.0">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width"/>
        <title>
          <xsl:value-of select="doc/title"/>
        </title>
        <link rel="stylesheet" href="/css/site.css"/>
        <style><![CDATA[body > p { color: red; }]]></style>
        <script src="/js/a.js"/>
        <script><![CDATA[if (1 < 2 && true) { var x = "<b>"; }]]></script>
      </head>
      <body>
        <p>t<br/>u</p>
        <img src="/i.png" alt=""/>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
