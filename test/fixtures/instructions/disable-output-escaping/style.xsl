<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:n="urn:n" version="1.0">
  <xsl:output method="html"/>
  <xsl:template match="/">
    <html>
      <body>
        <xsl:for-each select="doc/item">
          <div class="c">
            <xsl:value-of select="body" disable-output-escaping="yes"/>
          </div>
        </xsl:for-each>
        <p>
          <xsl:text disable-output-escaping="yes">&lt;em&gt;raw&lt;/em&gt; &amp;amp;</xsl:text>
        </p>
        <h1>
          <xsl:value-of select="doc/title" disable-output-escaping="yes"/>
        </h1>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
