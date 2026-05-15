package http

import (
	"errors"
	"fmt"
	"github.com/gin-gonic/gin"
	"io/fs"
	"net/http"
	"strings"
	"stzbHelper/http/route/api"
	"stzbHelper/web"
)

func RegisterRoute(r *gin.Engine) {
	staticRoute(r)
	api.Register(r.Group("/v1"))
}

func staticRoute(r *gin.Engine) {
	assetsFS, err := fs.Sub(web.PublicAssets, "dist")
	if err != nil {
		fmt.Println("init static assets error")
		return
	}
	staticServer := http.FileServer(http.FS(assetsFS))

	r.NoRoute(func(c *gin.Context) {
		reqpath := c.Request.URL.Path

		// root -> index.html
		if reqpath == "/" {
			reqpath = "/index.html"
		} else if reqpath == "/m/" || reqpath == "/m" {
			reqpath = "/m/index.html"
		} else if strings.HasPrefix(reqpath, "/m/") {
			filePath := reqpath[1:]
			_, err := assetsFS.Open(filePath)
			if errors.Is(err, fs.ErrNotExist) {
				reqpath = "/m/index.html"
			}
		} else if reqpath[len(reqpath)-1:] == "/" {
			reqpath = reqpath[:len(reqpath)-1]
		}

		// try to open static file
		filePath := reqpath[1:]
		file, err := assetsFS.Open(filePath)

		if err != nil {
			// SPA fallback: return index.html for unknown paths
			if !strings.HasPrefix(reqpath, "/v1/") && !strings.HasPrefix(reqpath, "/m") {
				reqpath = "/index.html"
				file, err = assetsFS.Open("index.html")
			}
			if err != nil {
				c.JSON(404, gin.H{"message": "404 - Page Not Found"})
				return
			}
		}

		defer file.Close()

		fileInfo, err := file.Stat()
		if err != nil {
			c.AbortWithStatus(http.StatusInternalServerError)
			return
		}
		if fileInfo.IsDir() {
			c.AbortWithStatus(http.StatusForbidden)
			return
		}

		staticServer.ServeHTTP(c.Writer, c.Request)
	})
}
