<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:n="urn:n" version="1.0">
  <xsl:output method="html"/>
  <xsl:template match="/">
    <html>
      <body>
        <a href="https://example.org/路径 a?q=值&amp;x=1#片段" name="名 字" title="标题 x">x</a>
        <img src="/图 片.png" alt="说 明"/>
        <form action="/提交"/>
        <div href="/é" data-u="/é"/>
        <a href="{concat('/', doc/title)}">t</a>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
