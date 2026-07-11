<template>
  <div class="chat-page">
    <div class="container">
      <div class="chat-container">
        <!-- Sidebar with conversations -->
        <div class="chat-sidebar">
          <div class="sidebar-header">
            <h3>Conversations</h3>
            <button
              class="btn btn-outline btn-sm"
              @click="refreshConversations"
            >
              <font-awesome-icon icon="sync" />
            </button>
          </div>

          <!-- Search for users -->
          <div class="chat-search">
            <input
              type="text"
              v-model="searchQuery"
              placeholder="Search users..."
              @input="searchUsers"
            />
            <div
              v-if="showSearchResults && searchResults.length > 0"
              class="search-results"
            >
              <div
                v-for="user in searchResults"
                :key="user.id"
                class="search-result-item"
                @click="startNewConversation(user)"
              >
                <div class="user-avatar">
                  <font-awesome-icon v-if="!user.avatar" icon="user" />
                  <img v-else :src="user.avatar" :alt="user.name" />
                </div>
                <div class="user-info">
                  <div class="user-name">{{ user.name }}</div>
                  <div class="user-email">{{ user.email }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Loading state -->
          <div v-if="loadingConversations" class="chat-loading">
            <font-awesome-icon icon="spinner" class="spin" />
            <p>Loading conversations...</p>
          </div>

          <!-- Conversation list -->
          <div v-else-if="conversations.length > 0" class="conversation-list">
            <div
              v-for="convo in conversations"
              :key="convo.id"
              class="conversation-item"
              :class="{
                active:
                  activeConversation && activeConversation.id === convo.id,
              }"
              @click="loadConversation(convo.id)"
            >
              <div class="conversation-avatar">
                <font-awesome-icon icon="user" v-if="!convo.recipient.avatar" />
                <img
                  v-else
                  :src="convo.recipient.avatar"
                  :alt="convo.recipient.name"
                />
              </div>
              <div class="conversation-details">
                <div class="conversation-name">{{ convo.recipient.name }}</div>
                <div class="conversation-preview">
                  {{ convo.lastMessage.text }}
                </div>
              </div>
              <div class="conversation-meta">
                <div class="conversation-time">
                  {{ formatTime(convo.lastMessage.timestamp) }}
                </div>
                <div v-if="convo.unreadCount > 0" class="unread-badge">
                  {{ convo.unreadCount }}
                </div>
              </div>
            </div>
          </div>

          <!-- Empty state -->
          <div v-else class="empty-state">
            <font-awesome-icon icon="comment-alt" class="empty-icon" />
            <p>No conversations yet</p>
            <p class="empty-hint">
              Search for users to start chatting or wait for someone to message
              you.
            </p>
          </div>

          <!-- Error message -->
          <div v-if="error" class="error-message">
            <font-awesome-icon icon="exclamation-circle" />
            {{ error }}
            <button class="btn-link" @click="loadConversations">Retry</button>
          </div>
        </div>

        <!-- Main chat area -->
        <div class="chat-main">
          <template v-if="activeConversation">
            <!-- Chat header -->
            <div class="chat-header">
              <div class="chat-user">
                <div class="user-avatar">
                  <font-awesome-icon
                    icon="user"
                    v-if="!activeConversation.recipient.avatar"
                  />
                  <img
                    v-else
                    :src="activeConversation.recipient.avatar"
                    :alt="activeConversation.recipient.name"
                  />
                </div>
                <div class="user-info">
                  <div class="user-name">
                    {{ activeConversation.recipient.name }}
                  </div>
                </div>
              </div>
              <div class="chat-actions">
                <button class="btn btn-outline btn-sm" @click="openUserProfile">
                  <font-awesome-icon icon="user" />
                  <span>View Profile</span>
                </button>
              </div>
            </div>

            <!-- Messages -->
            <div
              class="messages-container"
              ref="messagesContainer"
              @scroll="handleMessagesScroll"
            >
              <div v-if="hasMoreMessages" class="load-more-container">
                <button
                  class="btn btn-sm btn-outline"
                  @click="loadMoreMessages"
                  :disabled="loadingMoreMessages"
                >
                  <font-awesome-icon
                    v-if="loadingMoreMessages"
                    icon="spinner"
                    class="spin"
                  />
                  <span v-else>Load earlier messages</span>
                </button>
              </div>

              <div
                class="messages-date-divider"
                v-if="activeConversation.messages.length > 0"
              >
                {{
                  formatMessageDate(activeConversation.messages[0].timestamp)
                }}
              </div>

              <div
                v-for="(message, index) in activeConversation.messages"
                :key="message.id"
                class="message-wrapper"
              >
                <!-- Date divider -->
                <div
                  v-if="shouldShowDateDivider(message, index)"
                  class="messages-date-divider"
                >
                  {{ formatMessageDate(message.timestamp) }}
                </div>

                <!-- Message bubble -->
                <div
                  class="message"
                  :class="{
                    outgoing: message.isOutgoing,
                    incoming: !message.isOutgoing,
                  }"
                >
                  <div class="message-content">
                    <p v-html="formatMessageText(message.text)"></p>
                  </div>
                  <div class="message-time">
                    {{ formatMessageTime(message.timestamp) }}
                  </div>
                </div>

                <!-- Read receipt -->
                <div
                  v-if="
                    message.isOutgoing &&
                    isLastMessage(index) &&
                    isMessageRead(message)
                  "
                  class="message-read-status"
                >
                  <font-awesome-icon icon="check-circle" size="xs" />
                  <span>Read</span>
                </div>
              </div>

              <!-- Typing indicator -->
              <div
                v-if="activeConversation && typingUsers[activeConversation.id]"
                class="message-typing"
              >
                <div class="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span class="typing-text"
                  >{{ activeConversation.recipient.name }} is typing...</span
                >
              </div>
            </div>

            <!-- Message input -->
            <form @submit.prevent="sendMessage" class="message-form">
              <textarea
                v-model="newMessage"
                placeholder="Type your message..."
                rows="1"
                @input="autoGrow"
                ref="messageInput"
                @keydown.enter.prevent="handleKeyDown"
              ></textarea>
              <button
                type="submit"
                class="btn btn-primary message-send"
                :disabled="sending || !newMessage.trim()"
              >
                <font-awesome-icon icon="paper-plane" />
              </button>
            </form>

            <!-- Conversation error -->
            <div
              v-if="conversationError"
              class="error-message conversation-error"
            >
              <font-awesome-icon icon="exclamation-circle" />
              {{ conversationError }}
              <button
                class="btn-link"
                @click="loadConversation(activeConversation.id)"
              >
                Retry
              </button>
            </div>
          </template>

          <!-- No conversation selected state -->
          <div v-else class="no-conversation">
            <div class="no-conversation-content">
              <font-awesome-icon icon="comments" class="no-conversation-icon" />
              <h3>Select a conversation</h3>
              <p>
                Choose an existing conversation or search for a user to start
                chatting.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { nextTick } from "vue";
import ChatService from "@/services/ChatService";
import debounce from "@/utils/debounce";
import eventBus from "@/utils/eventBus";
import DOMPurify from "dompurify";

// No router import needed as this component uses this.$router instead

export default {
  name: "Chat",
  data() {
    return {
      conversations: [],
      activeConversation: null,
      newMessage: "",
      loadingConversations: false,
      sending: false,
      searchQuery: "",
      searchResults: [],
      showSearchResults: false,
      mockUsers: [
        {
          id: 2,
          name: "Alice Smith",
          email: "alice@example.com",
          avatar: null,
        },
        { id: 3, name: "Bob Johnson", email: "bob@example.com", avatar: null },
        {
          id: 4,
          name: "Carol Williams",
          email: "carol@example.com",
          avatar: null,
        },
        {
          id: 5,
          name: "David Brown",
          email: "david@example.com",
          avatar: null,
        },
      ],
      mockMessageInterval: null,
      error: null,
      conversationError: null,
      typingUsers: {}, // Map of conversation ID to typing status
      lastReadMessage: {}, // Map of conversation ID to last read message ID
      searchCounter: 0,
      messagePage: 1,
      messagesPerPage: 20,
      loadingMoreMessages: false,
      hasMoreMessages: true,
    };
  },
  created() {
    this.loadConversations();
    this.searchUsers = debounce(this.performSearch, 300);
  },
  mounted() {
    document.addEventListener("click", this.handleOutsideClick);
    this.setupMockMessageReceiver();

    // Add eventBus listeners
    eventBus.on("chat:new-message", this.handleNewMessage);
    eventBus.on("chat:incoming-message", this.handleIncomingMessage);

    // Check for route params
    if (this.$route.query.conversation) {
      this.loadConversation(this.$route.query.conversation);
    } else if (this.$route.query.user && this.$route.query.userName) {
      this.startNewConversation({
        id: parseInt(this.$route.query.user),
        name: this.$route.query.userName,
      });
    }
  },

  beforeUnmount() {
    document.removeEventListener("click", this.handleOutsideClick);
    this.clearMockMessageInterval();

    // Remove eventBus listeners
    eventBus.off("chat:new-message", this.handleNewMessage);
    eventBus.off("chat:incoming-message", this.handleIncomingMessage);

    // Cancel the debounced function to prevent memory leaks
    if (this.searchUsers && this.searchUsers.cancel) {
      this.searchUsers.cancel();
    }
  },

  methods: {
    async loadConversations() {
      this.loadingConversations = true;
      this.error = null;
      try {
        this.conversations = await ChatService.getConversations();
      } catch (error) {
        console.error("Failed to load conversations:", error);
        this.error = "Failed to load conversations. Please try again.";
      } finally {
        this.loadingConversations = false;
      }
    },

    async loadConversation(conversationId) {
      this.conversationError = null;
      try {
        // Reset pagination
        this.messagePage = 1;
        this.hasMoreMessages = true;

        // Modify to load only the first page
        this.activeConversation = await ChatService.getConversation(
          conversationId,
          this.messagePage,
          this.messagesPerPage,
        );

        // Update route query parameter
        this.$router.replace({
          query: { ...this.$route.query, conversation: conversationId },
        });

        // Update unread count and notify other components
        const convoIndex = this.conversations.findIndex(
          (c) => c.id === conversationId,
        );
        if (convoIndex !== -1) {
          this.conversations[convoIndex].unreadCount = 0;
          // Emit event to notify that messages have been read
          eventBus.emit("chat:read-messages");
        }

        // Scroll to bottom of messages
        nextTick(this.scrollToBottom);
      } catch (error) {
        console.error("Failed to load conversation:", error);
        this.conversationError = "Failed to load messages. Please try again.";
      }
    },

    async sendMessage() {
      if (!this.newMessage.trim() || !this.activeConversation) return;

      this.sending = true;
      try {
        const message = await ChatService.sendMessage(
          this.activeConversation.id,
          this.newMessage.trim(),
        );

        // Add message to conversation
        this.activeConversation.messages.push(message);

        // Update conversation in list
        const convoIndex = this.conversations.findIndex(
          (c) => c.id === this.activeConversation.id,
        );
        if (convoIndex !== -1) {
          const convo = this.conversations.splice(convoIndex, 1)[0];
          convo.lastMessage = {
            text: message.text,
            timestamp: message.timestamp,
          };
          this.conversations.unshift(convo);
        }

        // Clear input
        this.newMessage = "";
        this.$refs.messageInput.style.height = "auto";
        nextTick(this.scrollToBottom);

        // After successful send, simulate the recipient typing
        // This would use WebSockets in a real application
        this.simulateTypingIndicator(this.activeConversation.id);

        // After typing, simulate read receipt
        this.simulateReadReceipt(message.id, this.activeConversation.id);
      } catch (error) {
        console.error("Failed to send message:", error);
      } finally {
        this.sending = false;
      }
    },

    scrollToBottom() {
      if (this.$refs.messagesContainer) {
        this.$refs.messagesContainer.scrollTop =
          this.$refs.messagesContainer.scrollHeight;
      }
    },

    autoGrow(e) {
      const MAX_HEIGHT = 150; // Maximum height in pixels

      // Reset height to auto to get the correct scrollHeight
      e.target.style.height = "auto";

      // Calculate the new height
      const newHeight = Math.min(e.target.scrollHeight, MAX_HEIGHT);

      // Set the new height
      e.target.style.height = newHeight + "px";

      // Add scrollbar if content exceeds max height
      e.target.style.overflowY =
        e.target.scrollHeight > MAX_HEIGHT ? "auto" : "hidden";
    },

    handleKeyDown(e) {
      if (!e.shiftKey) {
        this.sendMessage();
      }
    },

    formatTime(timestamp) {
      const date = new Date(timestamp);
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      // Today: show time
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      }

      // Yesterday: show "Yesterday"
      if (date.toDateString() === yesterday.toDateString()) {
        return "Yesterday";
      }

      // This week: show day name
      if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
        return date.toLocaleDateString([], { weekday: "short" });
      }

      // Older: show date
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    },

    formatMessageTime(timestamp) {
      return new Date(timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    },

    formatMessageDate(timestamp) {
      const date = new Date(timestamp);
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      // Today
      if (date.toDateString() === now.toDateString()) {
        return "Today";
      }

      // Yesterday
      if (date.toDateString() === yesterday.toDateString()) {
        return "Yesterday";
      }

      // Show full date for older messages
      return date.toLocaleDateString([], {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    },

    shouldShowDateDivider(message, index) {
      if (index === 0) return false;

      const currentDate = new Date(message.timestamp);
      const prevDate = new Date(
        this.activeConversation.messages[index - 1].timestamp,
      );

      // Compare year, month, and day without string conversion
      return (
        currentDate.getFullYear() !== prevDate.getFullYear() ||
        currentDate.getMonth() !== prevDate.getMonth() ||
        currentDate.getDate() !== prevDate.getDate()
      );
    },

    refreshConversations() {
      this.loadingConversations = true;
      this.loadConversations().then(() => {
        this.loadingConversations = false;
      });
    },

    formatMessageText(text) {
      if (!text) return "";

      // First sanitize text completely to remove all HTML
      let sanitizedContent = DOMPurify.sanitize(text, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
      });

      // Convert URLs to clickable links in the sanitized text
      const urlRegex =
        /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi;

      sanitizedContent = sanitizedContent.replace(urlRegex, (url) => {
        try {
          // Parse and validate URL
          const parsedUrl = new URL(url);

          // Only allow http/https URLs
          if (
            parsedUrl.protocol !== "http:" &&
            parsedUrl.protocol !== "https:"
          ) {
            return url;
          }

          return `<a href="${parsedUrl.toString()}" target="_blank" rel="noopener noreferrer">${url}</a>`;
        } catch (e) {
          return url;
        }
      });

      // Handle newlines
      sanitizedContent = sanitizedContent.replace(/\n/g, "<br>");

      // Final sanitization with only allowed tags
      return DOMPurify.sanitize(sanitizedContent, {
        ALLOWED_TAGS: ["a", "br"],
        ALLOWED_ATTR: ["href", "target", "rel"],
      });
    },

    performSearch() {
      if (!this.searchQuery.trim()) {
        this.searchResults = [];
        this.showSearchResults = false;
        return;
      }

      // Create a unique search ID to prevent race conditions
      const currentSearchId = ++this.searchCounter;

      // Simple client-side search
      const query = this.searchQuery.toLowerCase();

      // Ensure searchResults is initialized as an array
      this.searchResults = [];

      // Simulate a slight delay to mimic API call
      setTimeout(() => {
        // Only update if this is still the most recent search
        if (currentSearchId === this.searchCounter) {
          this.searchResults = this.mockUsers.filter(
            (user) =>
              user.name.toLowerCase().includes(query) ||
              user.email.toLowerCase().includes(query),
          );

          // Keep showing the search results box even if no results are found
          // as long as there's a search query
          this.showSearchResults = this.searchQuery.trim().length > 0;
        }
      }, 100);
    },

    // Also modify any click handlers to not close the search results when clicking inside the search area
    handleOutsideClick(event) {
      if (this.showSearchResults && !event.target.closest(".chat-search")) {
        this.showSearchResults = false;
      }
    },

    async startNewConversation(user) {
      this.showSearchResults = false;
      this.searchQuery = "";

      try {
        // Start or get existing conversation
        const conversationId = await ChatService.startConversation(
          user.id,
          user.name,
        );

        await this.loadConversations();
        await this.loadConversation(conversationId);

        // Focus message input
        nextTick(() => {
          this.$refs.messageInput?.focus();
        });
      } catch (error) {
        console.error("Failed to start conversation:", error);
      }
    },

    openUserProfile() {
      if (!this.activeConversation) return;
      alert(`Viewing profile for ${this.activeConversation.recipient.name}`);
    },

    clearMockMessageInterval() {
      if (this.mockMessageInterval) {
        clearInterval(this.mockMessageInterval);
        this.mockMessageInterval = null;
      }
    },

    setupMockMessageReceiver() {
      // Clear any existing interval first
      this.clearMockMessageInterval();

      // Set a new interval with a more reasonable timing
      this.mockMessageInterval = setInterval(
        async () => {
          if (!this.conversations.length) return;

          // Pick a random conversation
          const randomIndex = Math.floor(
            Math.random() * this.conversations.length,
          );
          const conversation = this.conversations[randomIndex];

          // Get a random message
          const messages = [
            "Hello there! How's your day going?",
            "Just checking in. Have you had a chance to practice?",
            "I have some free time next week if you'd like to schedule a session.",
            "I found a great resource that might help you learn faster!",
            "Quick question about our last session...",
          ];
          const randomMessage =
            messages[Math.floor(Math.random() * messages.length)];

          // Simulate receiving a message
          const message = await ChatService.simulateIncomingMessage(
            conversation.id,
            randomMessage,
          );

          this.handleIncomingMessage(message);
        },
        30000, // Fixed interval of 30 seconds
      );
    },

    handleNewMessage(message) {
      // Handle new message event from eventBus
      if (message && message.conversationId) {
        this.handleIncomingMessage(message);
      }
    },

    handleIncomingMessage(message) {
      // If viewing this conversation, mark as read immediately
      if (
        this.activeConversation &&
        this.activeConversation.id === message.conversationId
      ) {
        this.activeConversation.messages.push({
          ...message,
          isOutgoing: false,
        });

        // Mark as read immediately and notify other components
        eventBus.emit("chat:read-messages");
        nextTick(this.scrollToBottom);
      } else {
        // Update conversation in list
        const convoIndex = this.conversations.findIndex(
          (c) => c.id === message.conversationId,
        );

        if (convoIndex !== -1) {
          const convo = this.conversations[convoIndex];
          convo.lastMessage = {
            text: message.text,
            timestamp: message.timestamp,
          };
          convo.unreadCount += 1;

          // Move to top of list
          this.conversations.splice(convoIndex, 1);
          this.conversations.unshift(convo);

          // Show notification
          eventBus.emit("show-notification", {
            type: "message",
            title: `New message from ${convo.recipient.name}`,
            message: message.text,
            duration: 5000,
          });
        }
      }
    },

    isLastMessage(index) {
      return index === this.activeConversation.messages.length - 1;
    },

    isMessageRead(message) {
      const conversationId = this.activeConversation.id;
      return this.lastReadMessage[conversationId] === message.id;
    },

    simulateReadReceipt(messageId, conversationId) {
      // In a real app, this would be triggered by a server event
      setTimeout(() => {
        this.lastReadMessage[conversationId] = messageId;
      }, 2000); // Simulate 2-second delay for read receipt
    },

    simulateTypingIndicator(conversationId) {
      // In a real app, this would be triggered by a server event
      this.typingUsers[conversationId] = true;

      // Simulate typing for 3 seconds
      setTimeout(() => {
        this.typingUsers[conversationId] = false;
      }, 3000);
    },

    async loadMoreMessages() {
      if (this.loadingMoreMessages || !this.hasMoreMessages) return;

      this.loadingMoreMessages = true;
      const messagesContainer = this.$refs.messagesContainer;

      // Skip if messages container isn't available
      if (!messagesContainer) {
        this.loadingMoreMessages = false;
        return;
      }

      // Store initial scroll position and heights
      const oldScrollTop = messagesContainer.scrollTop;
      const oldScrollHeight = messagesContainer.scrollHeight;

      try {
        // Load the next page of messages
        this.messagePage++;

        const olderMessages = await ChatService.getConversationMessages(
          this.activeConversation.id,
          this.messagePage,
          this.messagesPerPage,
        );

        // Update whether we have more messages to load
        this.hasMoreMessages = olderMessages.length >= this.messagesPerPage;

        if (olderMessages.length > 0) {
          // Prepend older messages to the conversation
          this.activeConversation.messages = [
            ...olderMessages,
            ...this.activeConversation.messages,
          ];

          // Maintain scroll position correctly by adjusting for the new content height
          nextTick(() => {
            if (messagesContainer) {
              const newScrollHeight = messagesContainer.scrollHeight;
              const heightDifference = newScrollHeight - oldScrollHeight;
              messagesContainer.scrollTop = oldScrollTop + heightDifference;
            }
          });
        } else {
          // No more messages
          this.hasMoreMessages = false;
        }
      } catch (error) {
        console.error("Failed to load more messages:", error);
        // Show error to user with notification - FIXED: using eventBus instead of $root.$emit
        eventBus.emit("show-notification", {
          type: "error",
          title: "Error",
          message: "Failed to load older messages. Please try again.",
          duration: 3000,
        });
      } finally {
        this.loadingMoreMessages = false;
      }
    },

    handleMessagesScroll(e) {
      // Optional: Auto-load more messages when scrolling to top
      if (
        e.target.scrollTop < 50 &&
        !this.loadingMoreMessages &&
        this.hasMoreMessages
      ) {
        this.loadMoreMessages();
      }
    },
  },
};
</script>

<style scoped>
.chat-page {
  padding: var(--space-4) 0;
}

.chat-container {
  display: flex;
  height: calc(100vh - 200px);
  min-height: 500px;
  background-color: var(--white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

/* Chat Sidebar */
.chat-sidebar {
  width: 320px;
  border-right: 1px solid var(--light);
  display: flex;
  flex-direction: column;
  background-color: var(--white);
}

.sidebar-header {
  padding: var(--space-4);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--light);
}

.sidebar-header h3 {
  margin: 0;
  font-size: var(--font-size-lg);
}

.chat-search {
  padding: var(--space-3);
  position: relative;
}

.chat-search input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--light);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
}

.search-results {
  position: absolute;
  top: 100%;
  left: var(--space-3);
  right: var(--space-3);
  background-color: var(--white);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: 10;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--light);
}

.search-result-item {
  display: flex;
  align-items: center;
  padding: var(--space-3);
  cursor: pointer;
  transition: background-color var(--transition-fast) ease;
}

.search-result-item:hover {
  background-color: var(--light);
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-color);
  font-size: var(--font-size-lg);
  margin-right: var(--space-3);
  flex-shrink: 0;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email {
  font-size: var(--font-size-xs);
  color: var(--medium);
}

.conversation-list {
  flex: 1;
  overflow-y: auto;
}

.conversation-item {
  display: flex;
  padding: var(--space-3);
  cursor: pointer;
  border-bottom: 1px solid var(--light);
  transition: background-color var(--transition-fast) ease;
}

.conversation-item:hover,
.conversation-item.active {
  background-color: var(--primary-light);
}

.conversation-details {
  flex: 1;
  min-width: 0;
  margin-right: var(--space-2);
}

.conversation-name {
  font-weight: var(--font-weight-medium);
  margin-bottom: var(--space-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conversation-preview {
  font-size: var(--font-size-xs);
  color: var(--medium);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 170px;
}

.conversation-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-size: var(--font-size-xs);
}

.conversation-time {
  color: var(--medium);
  margin-bottom: var(--space-1);
}

.unread-badge {
  background-color: var(--primary-color);
  color: white;
  font-size: 10px;
  font-weight: var(--font-weight-bold);
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-loading,
.empty-state,
.no-conversation {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
  color: var(--medium);
  text-align: center;
  height: 100%;
}

.empty-icon,
.no-conversation-icon {
  font-size: var(--font-size-3xl);
  margin-bottom: var(--space-4);
  opacity: 0.5;
}

.empty-hint {
  font-size: var(--font-size-sm);
  margin-top: var(--space-2);
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

/* Chat Main Area */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--light);
}

.chat-header {
  padding: var(--space-4);
  border-bottom: 1px solid var(--light);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--white);
}

.chat-user {
  display: flex;
  align-items: center;
}

.chat-actions {
  display: flex;
  gap: var(--space-2);
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
}

.messages-date-divider {
  text-align: center;
  margin: var(--space-4) 0;
  position: relative;
  color: var(--medium);
  font-size: var(--font-size-xs);
}

.messages-date-divider::before,
.messages-date-divider::after {
  content: "";
  position: absolute;
  top: 50%;
  width: 30%;
  height: 1px;
  background-color: var(--light);
}

.messages-date-divider::before {
  left: 0;
}

.messages-date-divider::after {
  right: 0;
}

.message-wrapper {
  margin-bottom: var(--space-3);
}

.message {
  max-width: 80%;
  padding: var(--space-3);
  border-radius: var(--radius-lg);
  position: relative;
  margin-bottom: var(--space-1);
}

.message.outgoing {
  align-self: flex-end;
  background-color: var(--primary-color);
  color: white;
  border-bottom-right-radius: var(--radius-sm);
  margin-left: auto;
}

.message.incoming {
  align-self: flex-start;
  background-color: var(--white);
  border-bottom-left-radius: var(--radius-sm);
}

.message-content {
  max-width: 80%;
  padding: var(--space-3);
  border-radius: var(--radius-lg);
  position: relative;
  margin-bottom: var(--space-1);
}

.message-content p {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.message-time {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: var(--space-1);
  text-align: right;
}

.message.incoming .message-time {
  color: var(--medium);
}

.message-sending {
  display: flex;
  justify-content: flex-start;
  margin-bottom: var(--space-3);
}

.typing-indicator {
  background-color: var(--white);
  padding: 10px 15px;
  border-radius: 1.5rem;
  border-bottom-left-radius: var(--radius-sm);
  display: flex;
  align-items: center;
}

.typing-indicator span {
  height: 8px;
  width: 8px;
  background-color: var(--medium);
  border-radius: 50%;
  display: inline-block;
  margin: 0 1px;
  opacity: 0.4;
  animation: typing 1.2s infinite;
}

.typing-indicator span:nth-child(1) {
  animation-delay: 0s;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0% {
    opacity: 0.4;
    transform: translateY(0);
  }

  50% {
    opacity: 1;
    transform: translateY(-5px);
  }

  100% {
    opacity: 0.4;
    transform: translateY(0);
  }
}

.message-form {
  display: flex;
  padding: var(--space-3);
  background-color: var(--white);
  border-top: 1px solid var(--light);
  align-items: flex-end;
}

.message-form textarea {
  flex: 1;
  background-color: var(--light);
  border: none;
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  resize: none;
  max-height: 150px;
  font-family: inherit;
  font-size: var(--font-size-md);
  margin-right: var(--space-2);
}

.message-form textarea:focus {
  outline: none;
}

.message-send {
  align-self: stretch;
  padding: 0 var(--space-4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.no-conversation-content {
  max-width: 300px;
}

/* Responsive */
@media (max-width: 768px) {
  .chat-container {
    flex-direction: column;
    height: calc(100vh - 180px);
  }

  .chat-sidebar {
    width: 100%;
    height: 300px;
    border-right: none;
    border-bottom: 1px solid var(--light);
  }

  .chat-main {
    height: calc(100vh - 500px);
  }
}

.error-message {
  background-color: var(--error-light);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  margin: var(--space-3);
  color: var(--error-color);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.conversation-error {
  margin-top: auto;
  margin-bottom: var(--space-2);
}

.btn-link {
  background: none;
  border: none;
  color: var(--primary-color);
  text-decoration: underline;
  cursor: pointer;
  padding: 0;
  font-size: inherit;
}

.message-read-status {
  display: flex;
  align-items: center;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 3px;
  justify-content: flex-end;
  gap: 3px;
}

.message-typing {
  display: flex;
  align-items: center;
  margin-bottom: var(--space-3);
  gap: var(--space-2);
}

.typing-text {
  font-size: var(--font-size-xs);
  color: var(--medium);
}

.load-more-container {
  display: flex;
  justify-content: center;
  padding: var(--space-3);
}
</style>
