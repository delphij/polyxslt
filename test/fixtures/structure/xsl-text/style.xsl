<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:n="urn:n" version="1.0">
  <xsl:output method="html"/>
  <xsl:template match="/">
    <html>
      <body>
        <p>
          <xsl:text> </xsl:text>
          <xsl:value-of select="doc/title"/>
          <xsl:text> — </xsl:text>
          <xsl:value-of select="count(doc/item)"/>
          <xsl:text>
</xsl:text>
        </p>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
