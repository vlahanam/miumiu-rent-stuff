package hub

import (
	"encoding/json"
	"log"
	"sync"

	"github.com/gorilla/websocket"
)

// Client đại diện cho một kết nối WebSocket
type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
	mu   sync.Mutex
}

// Hub quản lý tất cả WebSocket clients và broadcast message
type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

// Event là cấu trúc message gửi từ server xuống client
type Event struct {
	Loai string `json:"loai"`
	Data any    `json:"data"`
}

// NewHub tạo Hub mới
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

// Run là vòng lặp chính của Hub
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					// client chậm, bỏ qua
				}
			}
			h.mu.RUnlock()
		}
	}
}

// Broadcast gửi event JSON tới tất cả clients đang kết nối
func (h *Hub) Broadcast(loai string, data any) {
	event := Event{Loai: loai, Data: data}
	payload, err := json.Marshal(event)
	if err != nil {
		log.Printf("Hub.Broadcast marshal error: %v", err)
		return
	}
	select {
	case h.broadcast <- payload:
	default:
		log.Println("Hub broadcast channel đầy, bỏ qua")
	}
}

// RegisterClient đăng ký client mới vào hub
func (h *Hub) RegisterClient(conn *websocket.Conn) *Client {
	client := &Client{
		hub:  h,
		conn: conn,
		send: make(chan []byte, 256),
	}
	h.register <- client
	return client
}

// WritePump gửi message từ send channel xuống websocket connection
func (c *Client) WritePump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()
	for msg := range c.send {
		c.mu.Lock()
		err := c.conn.WriteMessage(websocket.TextMessage, msg)
		c.mu.Unlock()
		if err != nil {
			return
		}
	}
}

// ReadPump đọc message từ client (cần thiết để detect disconnect)
func (c *Client) ReadPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()
	for {
		_, _, err := c.conn.ReadMessage()
		if err != nil {
			return
		}
	}
}
