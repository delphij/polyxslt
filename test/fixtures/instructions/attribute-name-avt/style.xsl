<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:n="urn:n" version="1.0">
  <xsl:output method="html"/>
  <xsl:template match="/">
    <html>
      <body>
        <p><xsl:attribute name="data-{doc/item[1]/@kind}">v</xsl:attribute>t</p>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
