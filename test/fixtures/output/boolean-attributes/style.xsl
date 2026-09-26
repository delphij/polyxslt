<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:n="urn:n" version="1.0">
  <xsl:output method="html"/>
  <xsl:template match="/">
    <html>
      <body>
        <input type="checkbox" checked="checked" disabled="x" hidden="hidden" required="required"/>
        <select multiple="multiple">
          <option selected="selected">o</option>
        </select>
        <script defer="defer" async="async" src="/a.js"/>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
