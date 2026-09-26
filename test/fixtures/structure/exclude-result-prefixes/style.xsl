<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:n="urn:n" xmlns:o="urn:o" version="1.0" exclude-result-prefixes="n">
  <xsl:output method="html"/>
  <xsl:template match="/">
    <html>
      <body>
        <p class="x">
          <xsl:value-of select="doc/n:extra"/>
        </p>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
