<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:n="urn:n" version="1.0">
  <xsl:output method="html"/>
  <xsl:template match="/">
    <html>
      <body>
        <a href="/x" class="c"><xsl:attribute name="href">/y</xsl:attribute><xsl:attribute name="class">c <xsl:value-of select="doc/item[1]/@kind"/></xsl:attribute><xsl:attribute name="data-n"><xsl:choose><xsl:when test="doc/item">yes</xsl:when><xsl:otherwise>no</xsl:otherwise></xsl:choose></xsl:attribute>x</a>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
