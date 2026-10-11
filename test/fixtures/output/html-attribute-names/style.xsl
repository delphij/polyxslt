<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:n="urn:n" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.0">
  <xsl:output method="html"/>
  <xsl:template match="/">
    <html>
      <body>
        <a HREF="/a b" Title="T" class="c">upper</a>
        <input CHECKED="yes" disabled="disabled" value="v"/>
        <p n:role="r" xml:lang="en" id="p"><xsl:attribute name="n:role" namespace="urn:n">s</xsl:attribute>namespaced</p>
        <p><xsl:attribute name="n:href">/a b</xsl:attribute><xsl:attribute name="href">/c d</xsl:attribute>both</p>
        <svg viewBox="0 0 1 1" class="k"><a xlink:href="/a b" href="/c d">t</a></svg>
        <n:x Href="/a b"><span Title="in" selected="selected">inner</span></n:x>
        <p Title="z"><xsl:copy-of select="doc/item[1]/@*"/>copied</p>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
