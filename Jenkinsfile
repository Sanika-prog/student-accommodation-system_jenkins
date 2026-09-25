pipeline {
    agent any

    environment {
        IMAGE_NAME = "student-accommodation-system"
        IMAGE_TAG  = "${env.BUILD_NUMBER}"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build') {
            steps {
                echo 'TODO: npm ci, docker build, tag image'
            }
        }

        stage('Test') {
            steps {
                echo 'TODO: npm test (Jest + Supertest + mongodb-memory-server), publish coverage/junit reports'
            }
        }

        stage('Code Quality') {
            steps {
                echo 'TODO: eslint + SonarQube/SonarCloud scan'
            }
        }

        stage('Security') {
            steps {
                echo 'TODO: npm audit / Snyk / Trivy scan of image and dependencies'
            }
        }

        stage('Deploy') {
            steps {
                echo 'TODO: docker-compose up (app + mongo) to a test environment'
            }
        }

        stage('Release') {
            steps {
                echo 'TODO: tag image, promote to production registry/environment'
            }
        }

        stage('Monitoring') {
            steps {
                echo 'TODO: verify /health and /metrics, register with Prometheus/Datadog, alert rules'
            }
        }
    }

    post {
        always {
            echo 'Pipeline finished.'
        }
        failure {
            echo 'Pipeline failed — check stage logs above.'
        }
    }
}
