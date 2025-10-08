<template>
  <div class="skeleton-card">
    <div class="skeleton-line title"></div>
    <div class="skeleton-line text"></div>
    <div class="skeleton-line text short"></div>
    <div class="skeleton-footer">
      <div class="skeleton-avatar"></div>
      <div class="skeleton-tag"></div>
    </div>
  </div>
</template>

<style scoped>
.skeleton-card {
  background-color: #fff;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 10px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.skeleton-line {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite linear;
  border-radius: 4px;
  height: 12px;
  margin-bottom: 10px;
}

.skeleton-line.title {
  height: 16px;
  width: 70%;
  margin-bottom: 15px;
}

.skeleton-line.text {
  width: 100%;
}

.skeleton-line.short {
  width: 50%;
}

.skeleton-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 15px;
}

.skeleton-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite linear;
}

.skeleton-tag {
  width: 50px;
  height: 20px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite linear;
  border-radius: 4px;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>