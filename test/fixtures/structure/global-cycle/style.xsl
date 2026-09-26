<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:n="urn:n" version="1.0">
  <xsl:output method="html"/>
  <xsl:variable name="a" select="$b"/>
  <xsl:variable name="b" select="$a"/>
  <xsl:template match="/">
    <html>
      <body>
        <p>
          <xsl:value-of select="$a"/>
        </p>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
