<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
  <xsl:template match="/">
    <html>
      <body>
        <xsl:apply-templates select="doc"/>
      </body>
    </html>
  </xsl:template>
  <xsl:template match="doc">
    <div>
      <xsl:apply-templates select="."/>
    </div>
  </xsl:template>
</xsl:stylesheet>
