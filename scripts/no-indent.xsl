<?xml version="1.0" encoding="UTF-8"?>
<!--
  Copies a stylesheet unchanged except that indentation is turned off, so that the
  reference output contains no whitespace added by the serializer.
-->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template match="@*|node()">
    <xsl:copy>
      <xsl:apply-templates select="@*|node()"/>
    </xsl:copy>
  </xsl:template>

  <xsl:template match="/xsl:stylesheet|/xsl:transform">
    <xsl:copy>
      <xsl:apply-templates select="@*"/>
      <xsl:if test="not(xsl:output)">
        <xsl:element name="xsl:output" namespace="http://www.w3.org/1999/XSL/Transform">
          <xsl:attribute name="indent">no</xsl:attribute>
        </xsl:element>
      </xsl:if>
      <xsl:apply-templates select="node()"/>
    </xsl:copy>
  </xsl:template>

  <xsl:template match="xsl:output/@indent"/>

  <xsl:template match="xsl:output">
    <xsl:copy>
      <xsl:apply-templates select="@*"/>
      <xsl:attribute name="indent">no</xsl:attribute>
      <xsl:apply-templates select="node()"/>
    </xsl:copy>
  </xsl:template>
</xsl:stylesheet>
