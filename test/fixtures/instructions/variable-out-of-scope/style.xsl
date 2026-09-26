<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:n="urn:n" version="1.0">
  <xsl:output method="html"/>
  <xsl:template match="/">
    <html>
      <body>
        <xsl:if test="1">
          <xsl:variable name="v" select="1"/>
        </xsl:if>
        <p>
          <xsl:value-of select="$v"/>
        </p>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
