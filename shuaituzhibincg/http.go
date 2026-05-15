package main

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"io"
	"log"
	"stzbHelper/config"
	"stzbHelper/http"
	"sync"
	"time"
)

func StartHttpService(wait *sync.WaitGroup) {
	log.Println("HTTP服务启动")
	gin.DefaultWriter = io.Discard
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	// 配置CORS以支持CDN跨域请求
	r.Use(cors.New(cors.Config{
		AllowOriginFunc: func(origin string) bool {
			return true
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-Session-ID"},
		ExposeHeaders:    []string{"Content-Length", "X-Session-ID"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	http.RegisterRoute(r)

	port := "9527"
	if config.AppConfig != nil && config.AppConfig.Server.Port != "" {
		port = config.AppConfig.Server.Port
	}
	log.Printf("http://127.0.0.1:%s 浏览器打开此地址控制软件\n", port)
	//log.Println("http://127.0.0.1:9527/data.html#/team 此地址查询队伍")

	err := r.Run(":" + port)

	if err != nil {
		log.Fatal("http服务启动失败:" + err.Error())
		wait.Done()
		return
	}
}
